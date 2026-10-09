// UI language: Thai (default) or English. The bot stays Thai; this only
// affects the web app. The Thai table is the source of truth for keys.

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import type { IsoDate, Locale } from "../../convex/lib/dates";
import { describeDaysLeft, formatDate } from "../../convex/lib/dates";

export type { Locale } from "../../convex/lib/dates";

const LANG_KEY = "bestbefore.lang";

const th = {
  // shell
  appName: "BestBefore",
  loggingIn: "กำลังเข้าสู่ระบบด้วย LINE…",
  errorTitle: "เกิดข้อผิดพลาด",
  retry: "ลองอีกครั้ง",
  notMemberTitle: "ยังไม่ได้เป็นสมาชิก",
  notMemberBody:
    "บัญชี LINE นี้ยังไม่ได้เพิ่มบอท BestBefore เป็นเพื่อน เพิ่มเพื่อนก่อนแล้วกดลองอีกครั้ง",
  addFriend: "เพิ่มเพื่อน",
  navList: "รายการ",
  navAdd: "เพิ่ม",
  navHistory: "ประวัติ",
  navSettings: "ตั้งค่า",
  navHelp: "ช่วย",
  newVersion: "มีเวอร์ชันใหม่",
  reload: "โหลดใหม่",
  dismiss: "ปิด",
  // list
  listTitle: "ของในบ้าน",
  searchPlaceholder: "ค้นหาชื่อของ",
  filterAll: "ทั้งหมด",
  filterSoon: "ใกล้หมด",
  filterExpired: "หมดแล้ว",
  filterUndated: "ไม่มีวัน",
  itemCount: (n: number) => `${n} รายการ`,
  emptyList: "ยังไม่มีของในรายการ",
  addFirst: "เพิ่มของชิ้นแรก",
  emptyFilter: "ไม่มีรายการที่ตรงกับตัวกรองนี้",
  used: "ใช้แล้ว",
  usedAria: (name: string) => `ใช้แล้ว ${name}`,
  expiresPrefix: "หมดอายุ",
  // add
  addTitle: "เพิ่มของ",
  failed: "ไม่สำเร็จ",
  takePhoto: "ถ่ายรูป",
  fromGallery: "เลือกจากคลัง",
  photoHint: (max: number) => `ถ่ายด้านหน้าสินค้าและวันหมดอายุให้ชัด สูงสุด ${max} รูป`,
  removePhoto: "ลบรูปนี้",
  readFromPhotos: "อ่านวันหมดอายุจากรูป",
  manualEntry: "กรอกเองโดยไม่ใช้รูป",
  uploading: (done: number, total: number) => `กำลังอัปโหลดรูป ${done}/${total}…`,
  reading: "กำลังอ่านชื่อและวันหมดอายุจากรูป…",
  aiRead: "AI อ่านได้ว่า",
  aiNoDetail: "ไม่มีรายละเอียด",
  aiEstimated: "ประเมินจากประเภทสินค้า กรุณาตรวจสอบ",
  aiNone: "ไม่พบวันหมดอายุ กรุณากรอกเอง",
  aiUnavailable: "อ่านรูปไม่ได้ในตอนนี้ กรุณากรอกชื่อและวันหมดอายุเอง",
  confidenceHigh: "มั่นใจสูง",
  confidenceMedium: "มั่นใจปานกลาง",
  confidenceLow: "ไม่ค่อยมั่นใจ",
  nameLabel: "ชื่อของ",
  namePlaceholder: "เช่น นมสด ดัชมิลล์",
  expiryLabel: "วันหมดอายุ",
  expiryEmptyHint: "เว้นว่างได้ถ้ายังไม่ทราบ แล้วมาใส่ทีหลัง",
  noteLabel: "หมายเหตุ",
  notePlaceholder: "เช่น เปิดแล้วเมื่อ 10 ต.ค.",
  save: "บันทึก",
  saving: "กำลังบันทึก…",
  backToPhotos: "กลับไปเลือกรูป",
  badDate: "รูปแบบวันที่ไม่ถูกต้อง",
  // item
  notFound: "ไม่พบรายการนี้",
  backToList: "กลับไปหน้ารายการ",
  archivedUsed: "รายการนี้ใช้แล้ว",
  archivedDeleted: "รายการนี้ถูกลบแล้ว",
  on: "เมื่อ",
  restore: "กู้คืน",
  restored: "กู้คืนแล้ว",
  saved: "บันทึกแล้ว",
  photosAdded: "เพิ่มรูปแล้ว",
  markedUsed: "ทำเครื่องหมายว่าใช้แล้ว",
  deleted: "ลบแล้ว",
  photoRemoved: "ลบรูปแล้ว",
  current: "ปัจจุบัน",
  noExpiry: "ยังไม่ระบุวันหมดอายุ",
  aiReadShort: "AI อ่านได้",
  saveChanges: "บันทึกการแก้ไข",
  addPhotos: "เพิ่มรูป",
  upload: "อัปโหลด",
  delete: "ลบ",
  deleteTitle: (name: string) => `ลบ "${name}"?`,
  deleteBody: "กู้คืนได้จากหน้าประวัติภายใน 30 วัน หลังจากนั้นจะถูกลบถาวรพร้อมรูป",
  cancel: "ยกเลิก",
  confirmDelete: "ยืนยันลบ",
  removePhotoTitle: "ลบรูปนี้?",
  removePhotoBody: "รูปจะถูกลบทันทีและกู้คืนไม่ได้",
  // history
  historyTitle: "ประวัติ",
  historyHint: "ของที่ใช้แล้วหรือลบแล้ว กู้คืนได้ภายใน 30 วัน หลังจากนั้นระบบจะลบถาวรพร้อมรูป",
  historyEmpty: "ยังไม่มีประวัติ",
  statusUsed: "ใช้แล้ว",
  statusDeleted: "ลบแล้ว",
  restoreAria: (name: string) => `กู้คืน ${name}`,
  // settings
  settingsTitle: "ตั้งค่า",
  member: "สมาชิก",
  loggedInWithLine: "เข้าสู่ระบบด้วย LINE",
  logout: "ออก",
  appearance: "การแสดงผล",
  theme: "ธีม",
  themeLight: "สว่าง",
  themeDark: "มืด",
  themeSystem: "ตามระบบ",
  language: "ภาษา",
  languageHint: "มีผลกับหน้าเว็บเท่านั้น บอทใน LINE ตอบเป็นภาษาไทยเสมอ",
  notifications: "การแจ้งเตือน",
  notificationsHint:
    "สรุปของใกล้หมดอายุทุกเช้า 9 โมง ส่งเป็นการแจ้งเตือนของเบราว์เซอร์ ไม่ใช้โควตาข้อความ LINE",
  pushInLine:
    "ในแอป LINE เปิดการแจ้งเตือนไม่ได้ ให้เปิดเว็บนี้ใน Safari หรือ Chrome แล้วเพิ่มไปยังหน้าจอโฮม",
  pushUnsupported: "เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน",
  pushDisable: "ปิดบนอุปกรณ์นี้",
  pushEnable: "เปิดบนอุปกรณ์นี้",
  pushEnabled: "เปิดการแจ้งเตือนบนอุปกรณ์นี้แล้ว",
  pushDisabled: "ปิดการแจ้งเตือนบนอุปกรณ์นี้แล้ว",
  thisDevice: "อุปกรณ์นี้",
  otherDevice: "อุปกรณ์อื่น",
  removeDevice: "ลบอุปกรณ์นี้",
  reminderWindows: "ช่วงเวลาเตือน",
  reminderDaysLabel: 'นับว่า "ใกล้หมด" และแจ้งเตือนบนเว็บเมื่อเหลือไม่เกิน (วัน)',
  piggybackDaysLabel: "บอทเตือนในกลุ่มเมื่อเหลือไม่เกิน (วัน)",
  piggybackHint: "บอทจะตอบเตือนต่อท้ายข้อความใดก็ได้ในกลุ่ม วันละไม่เกินหนึ่งครั้งต่อกลุ่ม",
  groups: "กลุ่มที่บอทอยู่",
  groupsEmpty: "ยังไม่มี เชิญบอทเข้ากลุ่ม LINE ของบ้านก่อน",
  group: "กลุ่ม",
  room: "แชทหลายคน",
  lastWarned: (d: string) => `เตือนล่าสุด ${d}`,
  neverWarned: "ยังไม่เคยเตือน",
  warnInGroup: "เตือนในกลุ่ม",
  members: "สมาชิกในบ้าน",
  membersHint: "ใครที่เพิ่มบอทเป็นเพื่อนจะเห็นรายการเดียวกัน",
  // help
  helpTitle: "วิธีใช้",
  helpAddTitle: "เพิ่มของ",
  helpAddBody:
    "กด เพิ่ม แล้วถ่ายรูปด้านหน้าสินค้าและวันหมดอายุ ระบบจะอ่านชื่อและวันที่ให้ ตรวจสอบแล้วกดบันทึก ถ้าอ่านไม่ได้ก็กรอกเองได้",
  helpAddDate: "วันที่บนฉลากไทยมักเป็น วัน/เดือน/ปี พ.ศ. เช่น 15/10/69 คือ 15 ต.ค. 2569",
  helpGroupTitle: "ในกลุ่ม LINE",
  helpGroupBody: "แท็กบอทในกลุ่มแล้วพิมพ์คำสั่ง",
  helpCmdList: "ของทั้งหมด เรียงใกล้หมดอายุก่อน",
  helpCmdSoon: "ของที่ใกล้หมดอายุ",
  helpCmdExpired: "ของที่หมดอายุแล้ว",
  helpCmdHistory: "ของที่ใช้แล้ว",
  helpCmdHelp: "รายการคำสั่ง",
  helpGroupNote:
    "ในรายการมีปุ่ม ใช้แล้ว แก้ไข และ ลบ ให้กดได้เลย ถ้ามีของใกล้หมดอายุ บอทจะตอบเตือนต่อท้ายข้อความในกลุ่มวันละครั้ง",
  helpDmTitle: "แชทส่วนตัวกับบอท",
  helpDmBody: "พิมพ์คำสั่งเดียวกันได้โดยไม่ต้องแท็ก และมีปุ่มเพิ่มของในเมนูด้านล่าง",
  helpPushTitle: "การแจ้งเตือน",
  helpPushBody:
    "เปิดการแจ้งเตือนในหน้าตั้งค่า จะได้สรุปของใกล้หมดอายุทุกเช้า บน iPhone ต้องเปิดเว็บนี้ใน Safari แล้วเพิ่มไปยังหน้าจอโฮมก่อน",
  // lib errors
  loginFailed: (reason: string) => `เข้าสู่ระบบไม่สำเร็จ: ${reason}`,
  uploadFailed: (status: string) => `อัปโหลดรูปไม่สำเร็จ (${status})`,
  pushNoVapid: "ยังไม่ได้ตั้งค่า VITE_VAPID_PUBLIC_KEY",
  pushNotSupported:
    "เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน บน iPhone ให้เพิ่มไปยังหน้าจอโฮมก่อน แล้วเปิดจากไอคอนนั้น",
  pushDenied: "ไม่ได้รับอนุญาตให้แจ้งเตือน",
  pushKeysFailed: "อ่านคีย์การแจ้งเตือนไม่ได้",
};

export type Dictionary = typeof th;

const en: Dictionary = {
  appName: "BestBefore",
  loggingIn: "Signing in with LINE…",
  errorTitle: "Something went wrong",
  retry: "Try again",
  notMemberTitle: "Not a member yet",
  notMemberBody:
    "This LINE account has not added the BestBefore bot as a friend. Add it first, then try again.",
  addFriend: "Add friend",
  navList: "Items",
  navAdd: "Add",
  navHistory: "History",
  navSettings: "Settings",
  navHelp: "Help",
  newVersion: "New version available",
  reload: "Reload",
  dismiss: "Dismiss",
  listTitle: "Pantry",
  searchPlaceholder: "Search by name",
  filterAll: "All",
  filterSoon: "Soon",
  filterExpired: "Expired",
  filterUndated: "No date",
  itemCount: (n) => `${n} item${n === 1 ? "" : "s"}`,
  emptyList: "Nothing in the pantry yet",
  addFirst: "Add your first item",
  emptyFilter: "No items match this filter",
  used: "Used",
  usedAria: (name) => `Mark ${name} as used`,
  expiresPrefix: "Expires",
  addTitle: "Add item",
  failed: "Failed",
  takePhoto: "Take photo",
  fromGallery: "From gallery",
  photoHint: (max) =>
    `Shoot the front of the pack and the expiry date clearly, up to ${max} photos`,
  removePhoto: "Remove this photo",
  readFromPhotos: "Read expiry from photos",
  manualEntry: "Enter manually without photos",
  uploading: (done, total) => `Uploading photos ${done}/${total}…`,
  reading: "Reading name and expiry from photos…",
  aiRead: "AI read",
  aiNoDetail: "No details",
  aiEstimated: "Estimated from product type, please check",
  aiNone: "No expiry date found, please enter it",
  aiUnavailable:
    "Could not read the photos right now. Enter the name and expiry by hand.",
  confidenceHigh: "High confidence",
  confidenceMedium: "Medium confidence",
  confidenceLow: "Low confidence",
  nameLabel: "Name",
  namePlaceholder: "e.g. Dutch Mill fresh milk",
  expiryLabel: "Expiry date",
  expiryEmptyHint: "Leave blank if unknown and fill it in later",
  noteLabel: "Note",
  notePlaceholder: "e.g. opened on 10 Oct",
  save: "Save",
  saving: "Saving…",
  backToPhotos: "Back to photos",
  badDate: "Invalid date format",
  notFound: "Item not found",
  backToList: "Back to the list",
  archivedUsed: "This item is marked used",
  archivedDeleted: "This item was deleted",
  on: "on",
  restore: "Restore",
  restored: "Restored",
  saved: "Saved",
  photosAdded: "Photos added",
  markedUsed: "Marked as used",
  deleted: "Deleted",
  photoRemoved: "Photo removed",
  current: "Current",
  noExpiry: "No expiry date set",
  aiReadShort: "AI read",
  saveChanges: "Save changes",
  addPhotos: "Add photos",
  upload: "Upload",
  delete: "Delete",
  deleteTitle: (name) => `Delete "${name}"?`,
  deleteBody:
    "You can restore it from History within 30 days. After that it is removed for good, photos included.",
  cancel: "Cancel",
  confirmDelete: "Delete",
  removePhotoTitle: "Remove this photo?",
  removePhotoBody: "The photo is removed immediately and cannot be restored.",
  historyTitle: "History",
  historyHint:
    "Used and deleted items. Restore within 30 days; after that they are removed for good, photos included.",
  historyEmpty: "No history yet",
  statusUsed: "Used",
  statusDeleted: "Deleted",
  restoreAria: (name) => `Restore ${name}`,
  settingsTitle: "Settings",
  member: "Member",
  loggedInWithLine: "Signed in with LINE",
  logout: "Sign out",
  appearance: "Appearance",
  theme: "Theme",
  themeLight: "Light",
  themeDark: "Dark",
  themeSystem: "System",
  language: "Language",
  languageHint:
    "Affects the web app only. The LINE bot always replies in Thai.",
  notifications: "Notifications",
  notificationsHint:
    "A daily summary of items expiring soon at 9:00, sent as a browser notification. Uses no LINE message quota.",
  pushInLine:
    "Notifications cannot be enabled inside the LINE app. Open this site in Safari or Chrome and add it to your home screen.",
  pushUnsupported: "This browser does not support notifications",
  pushDisable: "Turn off on this device",
  pushEnable: "Turn on on this device",
  pushEnabled: "Notifications are on for this device",
  pushDisabled: "Notifications are off for this device",
  thisDevice: "This device",
  otherDevice: "Other device",
  removeDevice: "Remove this device",
  reminderWindows: "Reminder windows",
  reminderDaysLabel:
    'Count as "soon" and send the web reminder when this many days are left',
  piggybackDaysLabel: "Bot warns in the group when this many days are left",
  piggybackHint:
    "The bot appends a warning to any message in the group, at most once a day per group.",
  groups: "Groups the bot is in",
  groupsEmpty: "None yet. Invite the bot to your family's LINE group first.",
  group: "Group",
  room: "Multi-person chat",
  lastWarned: (d) => `Last warned ${d}`,
  neverWarned: "Never warned",
  warnInGroup: "Warn in group",
  members: "Household members",
  membersHint: "Everyone who added the bot as a friend sees the same list.",
  helpTitle: "How to use",
  helpAddTitle: "Adding items",
  helpAddBody:
    "Tap Add and photograph the front of the pack and its expiry date. The app reads the name and date for you; check them and tap Save. If it cannot read them, type them in.",
  helpAddDate:
    "Thai labels usually print day/month/year in the Buddhist era, e.g. 15/10/69 means 15 Oct 2026.",
  helpGroupTitle: "In a LINE group",
  helpGroupBody: "Mention the bot in the group and type a command",
  helpCmdList: "All items, nearest expiry first",
  helpCmdSoon: "Items expiring soon",
  helpCmdExpired: "Expired items",
  helpCmdHistory: "Used items",
  helpCmdHelp: "List of commands",
  helpGroupNote:
    "Each row has Used, Edit, and Delete buttons. When something is about to expire the bot appends a warning to a group message once a day.",
  helpDmTitle: "Chatting with the bot directly",
  helpDmBody:
    "The same commands work without the mention, and the menu at the bottom has an Add button.",
  helpPushTitle: "Notifications",
  helpPushBody:
    "Turn on notifications in Settings for a morning summary of items expiring soon. On iPhone, open this site in Safari and add it to the home screen first.",
  loginFailed: (reason) => `Sign-in failed: ${reason}`,
  uploadFailed: (status) => `Photo upload failed (${status})`,
  pushNoVapid: "VITE_VAPID_PUBLIC_KEY is not configured",
  pushNotSupported:
    "This browser does not support notifications. On iPhone, add the site to your home screen and open it from there.",
  pushDenied: "Notification permission was not granted",
  pushKeysFailed: "Could not read the push subscription keys",
};

const DICTIONARIES: Record<Locale, Dictionary> = { en, th };

export function readLocale(): Locale {
  const stored = localStorage.getItem(LANG_KEY);
  return stored === "en" ? "en" : "th";
}

/** Dictionary for code outside React (lib helpers that throw messages). */
export function dict(locale: Locale = readLocale()): Dictionary {
  return DICTIONARIES[locale];
}

interface I18nContextValue {
  locale: Locale;
  t: Dictionary;
  setLocale: (locale: Locale) => void;
  fmtDate: (date: IsoDate) => string;
  daysLeft: (days: number | null) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readLocale);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    localStorage.setItem(LANG_KEY, next);
    setLocaleState(next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      daysLeft: (days) => describeDaysLeft(days, locale),
      fmtDate: (date) => formatDate(date, locale),
      locale,
      setLocale,
      t: DICTIONARIES[locale],
    }),
    [locale, setLocale]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return ctx;
}
