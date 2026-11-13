import App from './App'
import { AppProvider } from './state/AppProvider'

export function Root() {
  return (
    <AppProvider>
      <App />
    </AppProvider>
  )
}
