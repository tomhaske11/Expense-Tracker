import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/features/expenses/constants';
import { ExpenseCategory } from '@/features/expenses/types';

interface CategoryIconProps {
  category: ExpenseCategory;
  /** Icon size and extra classes. */
  className?: string;
  /** Draw the icon in the category's chart color (default) or inherit the text color. */
  colored?: boolean;
}

/** The category's line icon, in its chart color unless `colored` is false. */
export default function CategoryIcon({ category, className = 'w-5 h-5', colored = true }: CategoryIconProps) {
  const Icon = CATEGORY_ICONS[category];
  return <Icon className={className} style={colored ? { color: CATEGORY_COLORS[category] } : undefined} />;
}
