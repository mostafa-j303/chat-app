const countryNames: Record<string, string> = {
  lebanon: "LB",
  "united arab emirates": "AE",
  emirates: "AE",
  france: "FR",
  canada: "CA",
  "united states": "US",
  usa: "US",
  "united kingdom": "GB",
  uk: "GB",
};

function parseCookies(cookieString: string) {
  return cookieString
    .split(";")
    .map((cookie) => cookie.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((cookies, cookie) => {
      const [key, ...valueParts] = cookie.split("=");
      cookies[key] = valueParts.join("=");
      return cookies;
    }, {});
}

function normalizeCountryCode(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const decodedValue = decodeURIComponent(value).trim();

  if (/^[a-z]{2}$/i.test(decodedValue)) {
    return decodedValue.toUpperCase();
  }

  const mappedCountry = countryNames[decodedValue.toLowerCase()];

  if (mappedCountry) {
    return mappedCountry;
  }

  try {
    const parsedValue = JSON.parse(decodedValue) as Record<string, unknown>;
    const nestedValue =
      parsedValue.countryCode ||
      parsedValue.country_code ||
      parsedValue.country ||
      parsedValue.countryName ||
      parsedValue.country_name;

    return typeof nestedValue === "string" ? normalizeCountryCode(nestedValue) : null;
  } catch {
    return null;
  }
}

export function getCountryCodeFromLocationCookie(cookieString: string) {
  const cookies = parseCookies(cookieString);
  const directKeys = ["countryCode", "country_code", "country", "geo_country", "location_country", "cf-ipcountry"];

  for (const key of directKeys) {
    const code = normalizeCountryCode(cookies[key]);

    if (code) {
      return code;
    }
  }

  for (const value of Object.values(cookies)) {
    const code = normalizeCountryCode(value);

    if (code) {
      return code;
    }
  }

  return null;
}

export function countryCodeToFlag(countryCode: string | null | undefined) {
  if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) {
    return "??";
  }

  return countryCode
    .split("")
    .map((character) => String.fromCodePoint(127397 + character.charCodeAt(0)))
    .join("");
}
