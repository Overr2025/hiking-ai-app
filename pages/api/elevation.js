export default async function handler(req, res) {
  const { batch } = req.query;

  if (!batch) {
    return res.status(400).json({ error: "Missing batch coordinates." });
  }

  try {
    const response = await fetch(`https://api.opentopodata.org/v1/aster30m?locations=${batch}`);
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.error || "API error." });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Internal server error." });
  }
}
