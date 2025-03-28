export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { goal } = req.body;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content:
              "Ti si stručni planinarski vodič. Korisnik će ti dati cilj i težinu rute. Vrati samo kratku listu tačaka (npr: Start: Pokljuka, Vodnikov dom, Kredarica, Triglav), bez dodatnog teksta. Nemoj objašnjavati, samo nabroji mesta redosledom.",
          },
          {
            role: "user",
            content: `Moj cilj je: ${goal}`,
          },
        ],
      }),
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    return res.status(200).json({ message: data.choices[0].message.content });
  } catch (error) {
    return res.status(500).json({ error: "Došlo je do greške na serveru." });
  }
}
