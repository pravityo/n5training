import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import { GrammarList, GrammarLesson } from './pages/Grammar.jsx';
import Practice from './pages/Practice.jsx';
import Exam from './pages/Exam.jsx';

export default function App() {
  return (
    <>
      <header>
        <strong className="brand">N5 Trainer</strong>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/grammar">Grammar</NavLink>
          <NavLink to="/practice">Practice</NavLink>
          <NavLink to="/exam">Mock exam</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/grammar" element={<GrammarList />} />
          <Route path="/grammar/:id" element={<GrammarLesson />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/exam" element={<Exam />} />
        </Routes>
      </main>
    </>
  );
}
