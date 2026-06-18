function AuthDivider() {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-[color:var(--color-border-default)]" />
      </div>
      <div className="relative flex justify-center text-[12px] uppercase tracking-wide">
        <span className="bg-white px-2 text-[color:var(--color-ink-400)]">or</span>
      </div>
    </div>
  );
}

export { AuthDivider };
