const creators = [
  { name: "Abdul", url: "https://github.com/AbdulGhaffarcs" },
  { name: "Qasim", url: "https://github.com/qasimio" },
]

export default function CreatorsFooter() {
  return (
    <footer className="fixed inset-x-0 bottom-[4.55rem] z-40 text-center text-xs text-zinc-500">
      <p>
        <span>Made with love by</span>{" "}
        {creators.map((creator, index) => (
          <span key={creator.name}>
            {index > 0 && index === creators.length - 1 ? "and " : index > 0 ? ", " : ""}
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
