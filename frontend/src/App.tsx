import { Routes, Route } from 'react-router-dom';
import { CreatePoll } from './components/CreatePoll';
import { PollPage } from './components/PollPage';

export default function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/" element={<CreatePoll />} />
        <Route path="/poll/:pollId" element={<PollPage />} />
      </Routes>
    </div>
  );
}
