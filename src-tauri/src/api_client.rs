use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Arc;

const MAX_RETRIES: u32 = 5;
const BASE_DELAY_SECS: f64 = 20.0;
const REQUEST_TIMEOUT_SECS: u64 = 120;

/// After this many back-to-back failures the client stops issuing requests.
/// Without it a dead endpoint (retired model, cold NIM function) makes every
/// dataset item wait out the full request timeout — 300 items x 120s of silence.
/// Checkpoints let the user re-run and pick up where the abort happened.
const ABORT_AFTER_CONSECUTIVE_FAILURES: u32 = 3;

/// Result from an LLM API call
#[derive(Debug, Clone)]
pub struct LlmResponse {
    pub output: Option<String>,
    pub reasoning: Option<String>,
    pub error: Option<String>,
}

/// OpenAI-compatible chat client
#[derive(Clone)]
pub struct ChatClient {
    http: Client,
    base_url: String,
    api_key: String,
    /// Shared across clones so the breaker trips once per endpoint, not per copy.
    consecutive_failures: Arc<AtomicU32>,
}

#[derive(Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    temperature: f64,
    top_p: f64,
    max_tokens: u32,
    stream: bool,
}

#[derive(Serialize, Deserialize, Clone)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Deserialize)]
struct ChatChoice {
    message: ChatMessageResponse,
}

#[derive(Deserialize)]
struct ChatMessageResponse {
    content: Option<String>,
}

// Streaming types
#[derive(Deserialize)]
struct StreamChunk {
    choices: Vec<StreamChoice>,
}

#[derive(Deserialize)]
struct StreamChoice {
    delta: StreamDelta,
}

#[derive(Deserialize)]
struct StreamDelta {
    content: Option<String>,
    reasoning_content: Option<String>,
}

impl ChatClient {
    pub fn new(base_url: &str, api_key: &str) -> Self {
        let http = Client::builder()
            .timeout(std::time::Duration::from_secs(REQUEST_TIMEOUT_SECS))
            .build()
            .expect("failed to build HTTP client");

        Self {
            http,
            base_url: base_url.trim_end_matches('/').to_string(),
            api_key: api_key.to_string(),
            consecutive_failures: Arc::new(AtomicU32::new(0)),
        }
    }

    /// Check if error is retryable (rate limit, server error, or timeout).
    /// Timeouts are included because a cold NIM function often needs one
    /// throwaway request before it starts answering.
    fn is_retryable(err: &str) -> bool {
        let lower = err.to_lowercase();
        [
            "429", "rate", "quota", "overload", "500", "503", "502",
            "timed out", "timeout", "error sending request", "connection reset",
        ]
        .iter()
        .any(|keyword| lower.contains(keyword))
    }

    /// Trips once the endpoint has failed `ABORT_AFTER_CONSECUTIVE_FAILURES`
    /// times in a row. Returns the message to hand back to the caller.
    fn breaker_tripped(&self) -> Option<String> {
        let n = self.consecutive_failures.load(Ordering::Relaxed);
        if n >= ABORT_AFTER_CONSECUTIVE_FAILURES {
            Some(format!(
                "Endpoint unusable: {} consecutive failures. Aborting remaining requests — \
                 check the model ID and API key, then re-run to resume from the last checkpoint.",
                n
            ))
        } else {
            None
        }
    }

    fn record_failure(&self) {
        self.consecutive_failures.fetch_add(1, Ordering::Relaxed);
    }

    fn record_success(&self) {
        self.consecutive_failures.store(0, Ordering::Relaxed);
    }

    /// True once the breaker has tripped. Callers use this to abort the run
    /// instead of grinding through later phases that would all short-circuit
    /// and produce an empty, misleading report.
    pub fn is_dead(&self) -> bool {
        self.breaker_tripped().is_some()
    }

    /// Streaming chat completion — captures both content and reasoning_content
    /// Includes retry with exponential backoff on rate limits
    pub async fn chat_stream(
        &self,
        model: &str,
        system: &str,
        user: &str,
        max_tokens: u32,
    ) -> LlmResponse {
        if let Some(msg) = self.breaker_tripped() {
            return LlmResponse { output: None, reasoning: None, error: Some(msg) };
        }

        for attempt in 0..MAX_RETRIES {
            let request = ChatRequest {
                model: model.to_string(),
                messages: vec![
                    ChatMessage { role: "system".into(), content: system.into() },
                    ChatMessage { role: "user".into(), content: user.into() },
                ],
                temperature: 1.0,
                top_p: 0.95,
                max_tokens,
                stream: true,
            };

            let response = match self.http
                .post(format!("{}/chat/completions", self.base_url))
                .header("Authorization", format!("Bearer {}", self.api_key))
                .header("Content-Type", "application/json")
                .header("Accept", "text/event-stream")
                .json(&request)
                .send()
                .await
            {
                Ok(r) => r,
                Err(e) => {
                    let err_str = format!("Request failed: {}", e);
                    if attempt < MAX_RETRIES - 1 && Self::is_retryable(&err_str) {
                        let wait = BASE_DELAY_SECS * (2.0_f64).powi(attempt as i32);
                        eprintln!("  Rate limit/error (attempt {}). Waiting {:.0}s...", attempt + 1, wait);
                        tokio::time::sleep(std::time::Duration::from_secs_f64(wait)).await;
                        continue;
                    }
                    self.record_failure();
                    return LlmResponse { output: None, reasoning: None, error: Some(err_str) };
                }
            };

            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                let err_str = format!("API error ({}): {}", status, body);
                if attempt < MAX_RETRIES - 1 && Self::is_retryable(&err_str) {
                    let wait = BASE_DELAY_SECS * (2.0_f64).powi(attempt as i32);
                    eprintln!("  Rate limit/error (attempt {}). Waiting {:.0}s...", attempt + 1, wait);
                    tokio::time::sleep(std::time::Duration::from_secs_f64(wait)).await;
                    continue;
                }
                self.record_failure();
                return LlmResponse { output: None, reasoning: None, error: Some(err_str) };
            }

            // Parse SSE stream
            let body = match response.text().await {
                Ok(b) => b,
                Err(e) => {
                    self.record_failure();
                    return LlmResponse {
                        output: None, reasoning: None,
                        error: Some(format!("Failed to read response: {}", e)),
                    };
                }
            };

            let mut full_content = String::new();
            let mut full_reasoning = String::new();

            for line in body.lines() {
                let line = line.trim();
                if line == "data: [DONE]" { break; }
                if let Some(data) = line.strip_prefix("data: ") {
                    if let Ok(chunk) = serde_json::from_str::<StreamChunk>(data) {
                        for choice in &chunk.choices {
                            if let Some(ref c) = choice.delta.content {
                                full_content.push_str(c);
                            }
                            if let Some(ref r) = choice.delta.reasoning_content {
                                full_reasoning.push_str(r);
                            }
                        }
                    }
                }
            }

            let content = if full_content.trim().is_empty() { None } else { Some(full_content.trim().to_string()) };
            let reasoning = if full_reasoning.trim().is_empty() { None } else { Some(full_reasoning.trim().to_string()) };

            // A 200 with an empty stream is still a broken endpoint — count it,
            // otherwise the breaker never trips on models that answer with nothing.
            if content.is_none() && reasoning.is_none() {
                self.record_failure();
                return LlmResponse {
                    output: None, reasoning: None,
                    error: Some("Empty response from model (no content in stream)".into()),
                };
            }

            self.record_success();
            return LlmResponse { output: content, reasoning, error: None };
        }

        self.record_failure();
        LlmResponse { output: None, reasoning: None, error: Some("Max retries exceeded".into()) }
    }

    /// Non-streaming chat completion — used for scoring (short responses)
    /// Includes retry with exponential backoff on rate limits
    pub async fn chat(
        &self,
        model: &str,
        system: &str,
        user: &str,
        max_tokens: u32,
    ) -> LlmResponse {
        if let Some(msg) = self.breaker_tripped() {
            return LlmResponse { output: None, reasoning: None, error: Some(msg) };
        }

        for attempt in 0..MAX_RETRIES {
            let request = ChatRequest {
                model: model.to_string(),
                messages: vec![
                    ChatMessage { role: "system".into(), content: system.into() },
                    ChatMessage { role: "user".into(), content: user.into() },
                ],
                temperature: 0.0,
                top_p: 1.0,
                max_tokens,
                stream: false,
            };

            let response = match self.http
                .post(format!("{}/chat/completions", self.base_url))
                .header("Authorization", format!("Bearer {}", self.api_key))
                .header("Content-Type", "application/json")
                .json(&request)
                .send()
                .await
            {
                Ok(r) => r,
                Err(e) => {
                    let err_str = format!("Request failed: {}", e);
                    if attempt < MAX_RETRIES - 1 && Self::is_retryable(&err_str) {
                        let wait = BASE_DELAY_SECS * (2.0_f64).powi(attempt as i32);
                        eprintln!("  Rate limit/error (attempt {}). Waiting {:.0}s...", attempt + 1, wait);
                        tokio::time::sleep(std::time::Duration::from_secs_f64(wait)).await;
                        continue;
                    }
                    self.record_failure();
                    return LlmResponse { output: None, reasoning: None, error: Some(err_str) };
                }
            };

            if !response.status().is_success() {
                let status = response.status();
                let body = response.text().await.unwrap_or_default();
                let err_str = format!("API error ({}): {}", status, body);
                if attempt < MAX_RETRIES - 1 && Self::is_retryable(&err_str) {
                    let wait = BASE_DELAY_SECS * (2.0_f64).powi(attempt as i32);
                    eprintln!("  Rate limit/error (attempt {}). Waiting {:.0}s...", attempt + 1, wait);
                    tokio::time::sleep(std::time::Duration::from_secs_f64(wait)).await;
                    continue;
                }
                self.record_failure();
                return LlmResponse { output: None, reasoning: None, error: Some(err_str) };
            }

            match response.json::<ChatCompletionResponse>().await {
                Ok(resp) => {
                    let content = resp.choices.first()
                        .and_then(|c| c.message.content.as_ref())
                        .map(|s| s.trim().to_string());
                    self.record_success();
                    return LlmResponse { output: content, reasoning: None, error: None };
                }
                Err(e) => {
                    self.record_failure();
                    return LlmResponse {
                        output: None, reasoning: None,
                        error: Some(format!("Failed to parse response: {}", e)),
                    };
                }
            }
        }

        self.record_failure();
        LlmResponse { output: None, reasoning: None, error: Some("Max retries exceeded".into()) }
    }
}
