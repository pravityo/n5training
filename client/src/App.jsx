import { NavLink, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import { GrammarList, GrammarLesson } from './pages/Grammar.jsx';
import Practice from './pages/Practice.jsx';
import Exam from './pages/Exam.jsx';
import Reference from './pages/Reference.jsx';
import Plan from './pages/Plan.jsx';
import Cards from './pages/Cards.jsx';

export default function App() {
  return (
    <>
      <header>
        <strong className="brand">N5 Trainer</strong>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/plan">Study plan</NavLink>
          <NavLink to="/cards">Flashcards</NavLink>
          <NavLink to="/grammar">Grammar</NavLink>
          <NavLink to="/reference">Vocab and kanji</NavLink>
          <NavLink to="/practice">Practice</NavLink>
          <NavLink to="/exam">Mock exam</NavLink>
        </nav>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/plan" element={<Plan />} />
          <Route path="/cards" element={<Cards />} />
          <Route path="/grammar" element={<GrammarList />} />
          <Route path="/grammar/:id" element={<GrammarLesson />} />
          <Route path="/reference" element={<Reference />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/exam" element={<Exam />} />
        </Routes>
      </main>
    </>
  );
}
