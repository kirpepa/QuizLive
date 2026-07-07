// VK-style wordmark: a rounded blue badge with "VK" + the product name,
// mirroring VK's product-naming convention (VK Звонки, VK Клипы, …).
export default function Logo({ size = 'md', onDark = false }) {
  const badge =
    size === 'lg' ? 'h-11 w-11 text-lg rounded-2xl' : 'h-9 w-9 text-[15px] rounded-xl';
  const word = size === 'lg' ? 'text-2xl' : 'text-lg';
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`grid ${badge} place-items-center bg-gradient-to-br from-brand-400 to-brand-600 font-extrabold tracking-tight text-white shadow-sm`}
      >
        VK
      </span>
      <span className={`${word} font-bold ${onDark ? 'text-white' : 'text-ink'}`}>
        Квиз
      </span>
    </span>
  );
}
