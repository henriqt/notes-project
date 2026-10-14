import { Routes, Route, Navigate } from 'react-router-dom'
import { NotesPage } from './pages/NotesPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<NotesPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App