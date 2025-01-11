import { render } from '@testing-library/react'
import { describe, expect, test, beforeEach, vi } from 'vitest'
import App from './App'

describe('App Component', () => {
  beforeEach(() => {
    // Reset any mocks before each test
    vi.clearAllMocks()
  })

  test('renders without crashing', () => {
    console.log('Running test: renders without crashing') // Debug statement
    render(<App />)
    
    // Debug output
    const body = document.body;
    console.log('Expected output: body to be defined'); // Debug statement
    console.log('Actual output:', body); // Debug statement
    expect(body).toBeDefined()
  })

  // Add more test cases here as needed
}) 