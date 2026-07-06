import type { Meal } from './schedule'

export interface NotificationCopy {
  title: string
  body: string
}

/**
 * Final notification strings live here (not in the app) because the push
 * payload must be self-contained — the service worker just displays it.
 */
export function mealCopy(meal: Meal, locale: string): NotificationCopy {
  const zh = locale === 'zh-TW'
  if (meal === 'lunch') {
    return zh
      ? { title: '午餐時間！🍜', body: '食乜好？抽一下！' }
      : { title: 'Lunch time! 🍜', body: "Can't decide? Give the wheel a spin." }
  }
  return zh
    ? { title: '晚餐時間！🍚', body: '食乜好？抽一下！' }
    : { title: 'Dinner time! 🍚', body: "Can't decide? Give the wheel a spin." }
}

export function testCopy(locale: string): NotificationCopy {
  return locale === 'zh-TW'
    ? { title: '食乜好 ✅', body: '通知設定成功！' }
    : { title: 'EatWhat ✅', body: 'Notifications are working!' }
}
