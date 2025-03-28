const axios = require("axios");
const cheerio = require("cheerio");

export default async function handler(req, res) {
  const { goal } = req.query;

  if (!goal) {
    return res.status(400).json({ error: "Nedostaje cilj." });
  }

  try {
    // 1. Pretraži hribi.net
    const searchUrl = `https://www.hribi.net/izpis_vsebine.asp?search=${encodeURIComponent(goal)}`;
    const response = await axios.get(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // 2. Pronađi prvi link koji vodi ka izletu
    const firstLink = $('a[href*="/izlet/"]').first().attr("href");

    if (!firstLink) {
      return res.status(404).json({ error: "Ruta nije pronađena." });
    }

    const detailUrl = `https://www.hribi.net${firstLink}`;
    const detailRes = await axios.get(detailUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    });

    const detailHtml = detailRes.data;
    const $$ = cheerio.load(detailHtml);

    // 3. Ekstrakcija opisa i tačaka
    const description = $$(".opis").first().text().trim();
    const places = [];

    $$(".pot_opis h2").each((i, el) => {
      const place = $$(el).text().trim();
      if (place) places.push(place);
    });

    res.status(200).json({ description, places });
  } catch (error) {
    console.error("Greška u API pozivu:", error);
    res.status(500).json({ error: "Neuspješno dohvaćanje podataka sa hribi.net." });
  }
}
