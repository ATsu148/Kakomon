import { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import './App.css';

interface Filters {
  subject: string;
  grade: string;
  period: string;
  pdfOnly: boolean;
}

const dummyResults = Array.from({ length: 10 }).map((_, i) => ({
  id: i,
  title: `Dummy Result ${i + 1}`,
}));

export default function App() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<Filters>({
    subject: '',
    grade: '',
    period: '',
    pdfOnly: false,
  });

  const activeFilterCount = [filters.subject, filters.grade, filters.period]
    .filter(Boolean).length + (filters.pdfOnly ? 1 : 0);

  const filteredResults = dummyResults.filter(r =>
    r.title.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0d0d0d] text-white font-sans relative overflow-hidden">
      <ResultsList results={filteredResults} />
      <FabButton onClick={() => setOpen(true)} count={activeFilterCount} />
      <SearchSheet
        open={open}
        onClose={() => setOpen(false)}
        query={query}
        setQuery={setQuery}
        filters={filters}
        setFilters={setFilters}
        onSearch={() => setOpen(false)}
      />
    </div>
  );
}

interface FabProps {
  onClick: () => void;
  count: number;
}

function FabButton({ onClick, count }: FabProps) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+16px)] right-4 z-20 bg-[#70bfff] text-[#0d0d0d] p-4 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
    >
      <MagnifyingGlassIcon className="h-6 w-6" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-xs rounded-full px-1">
          {count}
        </span>
      )}
    </button>
  );
}

interface SheetProps {
  open: boolean;
  onClose: () => void;
  query: string;
  setQuery: (v: string) => void;
  filters: Filters;
  setFilters: (f: Filters) => void;
  onSearch: () => void;
}

function SearchSheet({ open, onClose, query, setQuery, filters, setFilters, onSearch }: SheetProps) {
  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="fixed inset-0 z-30 flex items-end" role="dialog" aria-modal="true">
        <Transition.Child
          as={Fragment}
          enter="transition-opacity duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-300"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <Transition.Child
          as={Fragment}
          enter="transition-transform duration-400"
          enterFrom="translate-y-full"
          enterTo="translate-y-0"
          leave="transition-transform duration-400"
          leaveFrom="translate-y-0"
          leaveTo="translate-y-full"
        >
          <Dialog.Panel className="w-full bg-[rgba(255,255,255,0.05)] backdrop-blur-xl border border-[rgba(255,255,255,0.15)] rounded-t-3xl p-4 pb-[calc(env(safe-area-inset-bottom)+24px)] text-left shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
            <div className="flex items-center mb-4">
              <input
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="検索ワード"
                className="flex-1 bg-transparent border border-white/20 rounded-lg px-3 py-2 focus:outline-none"
              />
              <button onClick={onClose} className="ml-3 p-2">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="flex gap-2 mb-4">
              <select
                value={filters.subject}
                onChange={e => setFilters({ ...filters, subject: e.target.value })}
                className="flex-1 bg-transparent border border-white/20 rounded-lg px-2 py-2"
              >
                <option value="">教科</option>
                <option value="math">数学</option>
                <option value="eng">英語</option>
              </select>
              <select
                value={filters.grade}
                onChange={e => setFilters({ ...filters, grade: e.target.value })}
                className="flex-1 bg-transparent border border-white/20 rounded-lg px-2 py-2"
              >
                <option value="">学年</option>
                <option value="1">1年</option>
                <option value="2">2年</option>
              </select>
              <select
                value={filters.period}
                onChange={e => setFilters({ ...filters, period: e.target.value })}
                className="flex-1 bg-transparent border border-white/20 rounded-lg px-2 py-2"
              >
                <option value="">時期</option>
                <option value="spring">前期</option>
                <option value="fall">後期</option>
              </select>
            </div>
            <div className="flex items-center mb-4">
              <input
                id="pdfOnly"
                type="checkbox"
                checked={filters.pdfOnly}
                onChange={e => setFilters({ ...filters, pdfOnly: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="pdfOnly">PDFだけ</label>
            </div>
            <div className="flex gap-3">
              <button
                className="flex-1 bg-[#70bfff] text-[#0d0d0d] rounded-lg py-2"
                onClick={onSearch}
              >
                検索
              </button>
              <button
                className="flex-1 bg-white/10 rounded-lg py-2"
                onClick={() => setFilters({ subject: '', grade: '', period: '', pdfOnly: false })}
              >
                フィルタをクリア
              </button>
            </div>
          </Dialog.Panel>
        </Transition.Child>
      </Dialog>
    </Transition>
  );
}

interface ResultsProps {
  results: { id: number; title: string }[];
}

function ResultsList({ results }: ResultsProps) {
  return (
    <div className="p-4 space-y-2">
      {results.map(r => (
        <div key={r.id} className="p-4 bg-white/5 rounded-lg border border-white/10">
          {r.title}
        </div>
      ))}
    </div>
  );
}
