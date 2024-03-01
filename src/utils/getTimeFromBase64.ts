import base64 from 'react-native-base64'
import type { Base64 } from 'react-native-ble-plx'

export const getDateUint8Array = (dateData: Base64) => {
  const date = new Date()
  const dateArray = Uint8Array.from(base64.decode(dateData), c => String(c).charCodeAt(0))
  if (dateArray[0] && dateArray[1] && dateArray[2] && dateArray[3] && dateArray[4] && dateArray[5] && dateArray[6]) {
    date.setFullYear(dateArray[1] + (dateArray[0] << 8))
    date.setMonth(dateArray[2])
    date.setDate(dateArray[3])
    date.setHours(dateArray[4])
    date.setMinutes(dateArray[5])
    date.setSeconds(dateArray[6])
    return date.toISOString()
  }
  return null
}
