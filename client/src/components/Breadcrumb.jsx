import { Link } from 'react-router-dom';

export default function Breadcrumb({ items }) {
  return (
    <nav className="mb-4 flex items-center gap-2 text-sm">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={item.label} className="flex items-center gap-2">
            {i > 0 && <span className="text-gray-400">/</span>}
            {isLast ? (
              <span className="font-medium text-gray-800">{item.label}</span>
            ) : (
              <Link to={item.path} className="text-indigo-500 hover:underline cursor-pointer">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
