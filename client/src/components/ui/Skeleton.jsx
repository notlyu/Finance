import PropTypes from 'prop-types';

const Skeleton = ({ className = '', variant = 'text' }) => {
  const baseClasses = 'animate-pulse bg-surface-variant rounded';
  
  const variants = {
    text: 'h-4 w-full',
    title: 'h-6 w-3/4',
    avatar: 'h-12 w-12 rounded-full',
    card: 'h-32 w-full rounded-2xl',
    button: 'h-10 w-24 rounded-xl',
    row: 'h-16 w-full rounded-xl',
  };

  return (
    <div className={`${baseClasses} ${variants[variant]} ${className}`} />
  );
};

export const SkeletonText = ({ lines = 3, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} variant="text" className={i === lines - 1 ? 'w-2/3' : 'w-full'} />
    ))}
  </div>
);

export const SkeletonCard = ({ className = '' }) => (
  <div className={`bg-surface-container-lowest rounded-2xl p-4 space-y-3 ${className}`}>
    <div className="flex items-center gap-3">
      <Skeleton variant="avatar" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-1/2" />
        <Skeleton variant="text" className="w-1/3" />
      </div>
    </div>
    <Skeleton variant="text" />
    <Skeleton variant="text" className="w-2/3" />
  </div>
);

export const SkeletonTable = ({ rows = 5, cols = 4, className = '' }) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4 items-center">
        {Array.from({ length: cols }).map((_, j) => (
          <Skeleton key={j} variant="text" className="flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonChart = ({ className = '' }) => (
  <div className={`bg-surface-container-lowest rounded-2xl p-6 ${className}`}>
    <Skeleton variant="title" className="mb-4" />
    <div className="h-64 flex items-end gap-2">
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="flex-1" style={{ height: `${Math.random() * 60 + 40}%` }} />
      ))}
    </div>
  </div>
);

export const SkeletonList = ({ items = 3, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: items }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

Skeleton.propTypes = {
  className: PropTypes.string,
  variant: PropTypes.oneOf(['text', 'title', 'avatar', 'card', 'button', 'row']),
};

SkeletonText.propTypes = {
  lines: PropTypes.number,
  className: PropTypes.string,
};

SkeletonCard.propTypes = {
  className: PropTypes.string,
};

SkeletonTable.propTypes = {
  rows: PropTypes.number,
  cols: PropTypes.number,
  className: PropTypes.string,
};

SkeletonChart.propTypes = {
  className: PropTypes.string,
};

SkeletonList.propTypes = {
  items: PropTypes.number,
  className: PropTypes.string,
};

export default Skeleton;
