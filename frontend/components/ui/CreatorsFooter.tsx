const creators = [
  { name: "Ghaffar", url: "https://github.com/AbdulGhaffarcs" },
  { name: "Qasim", url: "https://github.com/qasimio" },
]

export default function CreatorsFooter() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-40 flex min-h-8 items-center justify-center border-t border-zinc-200/70 bg-zinc-50/95 px-4 pb-[env(safe-area-inset-bottom)] pt-1 text-center text-[11px] leading-5 text-zinc-500 backdrop-blur-sm">
      <p>
        <span>Made with ❤️ by</span>{" "}
        {creators.map((creator, index) => (
          <span key={creator.name}>
            {index > 0 && index === creators.length - 1
              ? " and "
              : index > 0
                ? ", "
                : ""}
            <a
              href={creator.url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-zinc-900"
            >
              {creator.name}
            </a>
          </span>
        ))}
        .
      </p>
    </footer>
  )
}