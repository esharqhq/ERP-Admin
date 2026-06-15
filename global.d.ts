import en from "./messages/en.json";

type Messages = typeof en;

declare global {
  // Use type safe translation keys from next-intl
  interface IntlMessages extends Messages {}
}
