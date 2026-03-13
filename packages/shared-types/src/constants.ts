import { ZodiacSign, Element } from "./enums.js";

export const SIGN_ELEMENT: Record<ZodiacSign, Element> = {
  [ZodiacSign.Aries]: Element.Fire,
  [ZodiacSign.Taurus]: Element.Earth,
  [ZodiacSign.Gemini]: Element.Air,
  [ZodiacSign.Cancer]: Element.Water,
  [ZodiacSign.Leo]: Element.Fire,
  [ZodiacSign.Virgo]: Element.Earth,
  [ZodiacSign.Libra]: Element.Air,
  [ZodiacSign.Scorpio]: Element.Water,
  [ZodiacSign.Sagittarius]: Element.Fire,
  [ZodiacSign.Capricorn]: Element.Earth,
  [ZodiacSign.Aquarius]: Element.Air,
  [ZodiacSign.Pisces]: Element.Water,
};

export const SIGN_ORDER: ZodiacSign[] = [
  ZodiacSign.Aries, ZodiacSign.Taurus, ZodiacSign.Gemini,
  ZodiacSign.Cancer, ZodiacSign.Leo, ZodiacSign.Virgo,
  ZodiacSign.Libra, ZodiacSign.Scorpio, ZodiacSign.Sagittarius,
  ZodiacSign.Capricorn, ZodiacSign.Aquarius, ZodiacSign.Pisces,
];
