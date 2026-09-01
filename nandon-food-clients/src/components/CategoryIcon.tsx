/**
 * A Lucide glyph per top-level category, matched loosely by name so live
 * admin categories still get a sensible icon. Shared by the header mega-menu
 * and the home category strip so both always agree.
 */
import { Drumstick, Beef, Fish, Bird, Wheat, Egg, Snowflake, Milk, Carrot, ShoppingBasket } from "lucide-react";

export default function CategoryIcon({ name, size = 20, className = "" }: { name: string; size?: number; className?: string }) {
  const p = { size, strokeWidth: 1.75, className };
  if (/chicken|murgi|broiler|poultry/i.test(name)) return <Drumstick {...p} />;
  if (/beef|cattle|mutton|meat/i.test(name)) return <Beef {...p} />;
  if (/fish|hilsa|ilish|prawn|shrimp/i.test(name)) return <Fish {...p} />;
  if (/duck|bird/i.test(name)) return <Bird {...p} />;
  if (/egg/i.test(name)) return <Egg {...p} />;
  if (/frozen/i.test(name)) return <Snowflake {...p} />;
  if (/milk|dairy/i.test(name)) return <Milk {...p} />;
  if (/veg|agro|grain|rice|crop|farm/i.test(name)) return <Wheat {...p} />;
  if (/fruit|carrot|produce/i.test(name)) return <Carrot {...p} />;
  return <ShoppingBasket {...p} />;
}
