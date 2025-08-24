// Gemini AI API service for report generation
class GeminiService {
  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent'
  }

  async generateReport(prompt) {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your environment variables.')
    }

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 8192,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Gemini API error: ${response.status} - ${errorText}`)
      }

      const data = await response.json()
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        return data.candidates[0].content.parts[0].text
      } else {
        throw new Error(`Invalid response format from Gemini API: ${JSON.stringify(data)}`)
      }
    } catch (error) {
      console.error('Gemini API call failed:', error)
      throw error
    }
  }


  extractNumber(text, label) {
    const regex = new RegExp(`${label}\\s*(\\d+(?:\\.\\d+)?)`, 'i')
    const match = text.match(regex)
    return match ? parseFloat(match[1]) : null
  }

  extractValue(text, label) {
    const regex = new RegExp(`${label}\\s*([^\\n,]+)`, 'i')
    const match = text.match(regex)
    return match ? match[1].trim() : null
  }
}

export default new GeminiService()