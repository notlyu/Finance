import { useState, useEffect } from 'react';
import { flags } from '../config/flags';

const ONBOARDING_KEY = 'onboarding_completed';
// Слайд «Личное и Семья» — только при включённом семейном слое.
const SHOW_SPACES_SLIDE = flags.spaceUxV2 && flags.familyEnabled;
// Версия: бамп до '2' только когда есть слайд про пространства.
const ONBOARDING_VERSION = SHOW_SPACES_SLIDE ? '2' : '1';

// T4.1 — слайд про модель «Личное/Семья» (текст из ТЗ §1.4). Показываем только при flag.
const spacesSlide = {
  id: 'spaces',
  icon: 'swap_horiz',
  title: 'Личное и Семья',
  description: '«Личное» — ваш кошелёк, суммы видите только вы. «Семья» — общий бюджет, видимый обоим. Оба баланса показаны сразу на главной, а у каждой операции вы выбираете «Личное» или «Семья». Переключатель сверху меняет только то, что вы смотрите.',
  color: '#006c49',
};

const baseSlides = [
  {
    id: 'welcome',
    icon: 'wallet',
    title: 'Все финансы в одном месте',
    description: 'Учитывайте доходы и расходы, ведите счета и держите бюджет под контролем.',
    color: '#3525cd',
  },
  {
    id: 'goals',
    icon: 'track_changes',
    title: 'Накопления и цели',
    description: 'Ставьте цели с суммой и сроком. Настраивайте автопополнение с каждой зарплаты.',
    color: '#006c49',
  },
  {
    id: 'safety',
    icon: 'savings',
    title: 'Подушка безопасности',
    description: 'Создайте финансовую подушку на 3-6-12 месяцев. Приложение рассчитает нужную сумму.',
    color: '#95002b',
  },
];

// Слайд «Личное/Семья» вставляем вторым — только при включённом семейном слое.
const slides = SHOW_SPACES_SLIDE
  ? [baseSlides[0], spacesSlide, ...baseSlides.slice(1)]
  : baseSlides;

export default function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const completed = localStorage.getItem(ONBOARDING_KEY);
    const version = localStorage.getItem(`${ONBOARDING_KEY}_version`);

    if (completed !== 'true' || version !== ONBOARDING_VERSION) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    localStorage.setItem(`${ONBOARDING_KEY}_version`, ONBOARDING_VERSION);
    setIsOpen(false);
  };

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      handleClose();
    }
  };

  const handleSkip = () => {
    handleClose();
  };

  if (!isOpen) return null;

  const slide = slides[currentSlide];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleSkip} />

      <div className="relative bg-surface rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-scale-in">
        <button
          onClick={handleSkip}
          className="absolute top-4 right-4 p-2 text-on-surface-variant hover:text-on-surface transition-colors z-10"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        <div
          className="h-40 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${slide.color}20, ${slide.color}05)` }}
        >
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ backgroundColor: slide.color }}
          >
            <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {slide.icon}
            </span>
          </div>
        </div>

        <div className="p-8">
          <div className="flex gap-2 justify-center mb-6">
            {slides.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === currentSlide ? 'w-6' : 'w-1.5'
                }`}
                style={{ backgroundColor: i === currentSlide ? slide.color : '#e5e7eb' }}
              />
            ))}
          </div>

          <h2 className="text-2xl font-bold text-on-surface text-center mb-3 font-headline">
            {slide.title}
          </h2>
          <p className="text-on-surface-variant text-center text-sm leading-relaxed">
            {slide.description}
          </p>

          <div className="flex gap-3 mt-8">
            <button
              onClick={handleSkip}
              className="flex-1 py-3 text-on-surface-variant font-medium text-sm hover:text-on-surface transition-colors"
            >
              Пропустить
            </button>
            <button
              onClick={handleNext}
              className="flex-1 py-3 bg-primary text-white font-bold rounded-xl text-sm hover:opacity-90 transition-opacity"
            >
              {currentSlide === slides.length - 1 ? 'Начать' : 'Далее'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function resetOnboarding() {
  localStorage.removeItem(ONBOARDING_KEY);
  localStorage.removeItem(`${ONBOARDING_KEY}_version`);
}