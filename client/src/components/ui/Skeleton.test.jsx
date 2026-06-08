import { render, screen } from '@testing-library/react';
import Skeleton, {
  SkeletonText,
  SkeletonCard,
  SkeletonTable,
  SkeletonChart,
  SkeletonList,
} from './Skeleton';

describe('Skeleton', () => {
  it('renders a div with animate-pulse class', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild.className).toContain('animate-pulse');
  });

  it('defaults to text variant', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild.className).toContain('h-4');
    expect(container.firstChild.className).toContain('w-full');
  });

  it('applies title variant classes', () => {
    const { container } = render(<Skeleton variant="title" />);
    expect(container.firstChild.className).toContain('h-6');
    expect(container.firstChild.className).toContain('w-3/4');
  });

  it('applies avatar variant classes', () => {
    const { container } = render(<Skeleton variant="avatar" />);
    expect(container.firstChild.className).toContain('h-12');
    expect(container.firstChild.className).toContain('w-12');
    expect(container.firstChild.className).toContain('rounded-full');
  });

  it('applies card variant classes', () => {
    const { container } = render(<Skeleton variant="card" />);
    expect(container.firstChild.className).toContain('h-32');
    expect(container.firstChild.className).toContain('w-full');
  });

  it('applies button variant classes', () => {
    const { container } = render(<Skeleton variant="button" />);
    expect(container.firstChild.className).toContain('h-10');
    expect(container.firstChild.className).toContain('w-24');
  });

  it('applies row variant classes', () => {
    const { container } = render(<Skeleton variant="row" />);
    expect(container.firstChild.className).toContain('h-16');
    expect(container.firstChild.className).toContain('w-full');
  });

  it('merges custom className', () => {
    const { container } = render(<Skeleton className="custom-class" />);
    expect(container.firstChild.className).toContain('custom-class');
  });
});

describe('SkeletonText', () => {
  it('renders the specified number of lines', () => {
    const { container } = render(<SkeletonText lines={4} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(4);
  });

  it('defaults to 3 lines', () => {
    const { container } = render(<SkeletonText />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons).toHaveLength(3);
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonText className="custom" />);
    expect(container.firstChild.className).toContain('custom');
  });
});

describe('SkeletonCard', () => {
  it('renders avatar and text elements', () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });

  it('renders an avatar skeleton', () => {
    const { container } = render(<SkeletonCard />);
    const avatars = container.querySelectorAll('.rounded-full');
    expect(avatars.length).toBeGreaterThanOrEqual(1);
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonCard className="custom" />);
    expect(container.firstChild.className).toContain('custom');
  });
});

describe('SkeletonTable', () => {
  it('renders the specified number of rows', () => {
    const { container } = render(<SkeletonTable rows={3} cols={3} />);
    const rows = container.firstChild.children;
    expect(rows).toHaveLength(3);
  });

  it('renders the specified number of columns per row', () => {
    const { container } = render(<SkeletonTable rows={2} cols={4} />);
    const firstRow = container.firstChild.children[0];
    expect(firstRow.children).toHaveLength(4);
  });

  it('defaults to 5 rows and 4 cols', () => {
    const { container } = render(<SkeletonTable />);
    expect(container.firstChild.children).toHaveLength(5);
    expect(container.firstChild.children[0].children).toHaveLength(4);
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonTable className="custom" />);
    expect(container.firstChild.className).toContain('custom');
  });
});

describe('SkeletonChart', () => {
  it('renders a title skeleton', () => {
    const { container } = render(<SkeletonChart />);
    const titleSkeletons = container.querySelectorAll('.h-6');
    expect(titleSkeletons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders 12 bar skeletons', () => {
    const { container } = render(<SkeletonChart />);
    const bars = container.querySelectorAll('.flex-1');
    expect(bars).toHaveLength(12);
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonChart className="custom" />);
    expect(container.firstChild.className).toContain('custom');
  });
});

describe('SkeletonList', () => {
  it('renders the specified number of skeleton cards', () => {
    const { container } = render(<SkeletonList items={2} />);
    const cards = container.querySelectorAll('.rounded-3xl');
    expect(cards).toHaveLength(2);
  });

  it('defaults to 3 items', () => {
    const { container } = render(<SkeletonList />);
    const cards = container.querySelectorAll('.rounded-3xl');
    expect(cards).toHaveLength(3);
  });

  it('applies custom className', () => {
    const { container } = render(<SkeletonList className="custom" />);
    expect(container.firstChild.className).toContain('custom');
  });
});
