export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-in fade-in slide-in-from-bottom-1 duration-300 motion-reduce:animate-none">{children}</div>;
}
