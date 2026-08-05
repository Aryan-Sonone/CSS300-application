import React from 'react'
import { Navigate } from 'react-router-dom'

export function NotFoundPage() {
  return <Navigate to="/setup" replace />
}