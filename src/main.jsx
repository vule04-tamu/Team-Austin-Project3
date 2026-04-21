import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './main.css'
import App from './App.jsx'
import { LanguageProvider } from './LanguageSwitch.jsx'
import { TextSizeProvider } from './TextSizeControl.jsx'
import { ScreenMagnifierProvider } from './ScreenMagnifierContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <TextSizeProvider>
        <ScreenMagnifierProvider>
          <App />
        </ScreenMagnifierProvider>
      </TextSizeProvider>
    </LanguageProvider>
  </StrictMode>,
)
