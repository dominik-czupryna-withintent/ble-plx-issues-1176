import React, { useState } from 'react'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { BleError, Device, type DeviceId } from 'react-native-ble-plx'
import { ScrollView } from 'react-native'
import type { TestStateType } from '../../../types'
import { BLEService } from '../../../services'
import type { MainStackParamList } from '../../../navigation/navigators'
import { AppButton, AppText, AppTextInput, ScreenDefaultContainer, TestStateDisplay } from '../../../components/atoms'
import {
  currentTimeCharacteristic,
  currentTimeCharacteristicTimeTriggerDescriptor,
  deviceTimeService
} from '../../../consts/nRFDeviceConsts'
import { getDateAsBase64 } from '../../../utils/getDateAsBase64'
import { getDateUint8Array } from '../../../utils/getTimeFromBase64'

type DeviceConnectDisconnectTestScreenProps = NativeStackScreenProps<MainStackParamList, 'AUTODISCONNECT_SCREEN'>

const disconnectedListener = (onMessage: () => void) => (error: BleError | null, device: Device | null) => {
  console.info('disconnectedListener')
  onMessage()
  if (error) {
    console.error(JSON.stringify(error, null, 4))
  }
  if (device) {
    console.info(JSON.stringify(device, null, 4))
  }
}

export function AutodisconnectScreen(_props: DeviceConnectDisconnectTestScreenProps) {
  const [expectedDeviceName, setExpectedDeviceName] = useState('')
  const [testScanDevicesState, setTestScanDevicesState] = useState<TestStateType>('WAITING')
  const [deviceId, setDeviceId] = useState('')
  const [dataReads, setDataReads] = useState<(string | null | undefined)[]>([])

  const addDataToTimeReads = (data: unknown) =>
    setDataReads(prevState => prevState.concat(`${new Date().toTimeString()} - ${data}`))

  const checkDeviceName = (device: Device) =>
    device.name?.toLocaleLowerCase() === expectedDeviceName.toLocaleLowerCase()

  const connectDevice = async (advertisingExtension: boolean) => {
    setTestScanDevicesState('IN_PROGRESS')
    await BLEService.initializeBLE()
    addDataToTimeReads('Looking for device')
    await BLEService.scanDevices(
      async (device: Device) => {
        if (checkDeviceName(device)) {
          console.info(`connecting to ${device.id}`)
          addDataToTimeReads('Device found')
          await connectToDevice(device)
          setTestScanDevicesState('DONE')
          setDeviceId(device.id)
          addDataToTimeReads(`Connected to ${device.id}`)
        }
      },
      [deviceTimeService],
      {
        legacyScan: !advertisingExtension
      }
    )
  }

  const discoverCharacteristics = async () => {
    if (!deviceId) {
      console.error('Device not ready')
      return
    }
    try {
      console.info(`discovering in ${deviceId}`)
      await discoverServices()
    } catch (error) {
      console.error('Multiple discovering error')
    }
  }

  const connectToDevice = (device: Device) => BLEService.connectToDevice(device.id)

  const discoverServices = () => BLEService.discoverAllServicesAndCharacteristicsForDevice()

  const setupOnDeviceDisconnected = (directDeviceId?: DeviceId) => {
    if (!deviceId && !directDeviceId) {
      console.error('Device not ready')
      return
    }
    BLEService.onDeviceDisconnectedCustom(
      directDeviceId || deviceId,
      disconnectedListener(() => addDataToTimeReads(`DisconnectListener get message`))
    )
    const info = `setup onDeviceDisconnectedCustom for ${directDeviceId || deviceId}`
    console.info(info)
    addDataToTimeReads(info)
  }

  const readTimeDescriptorForDevice = () =>
    BLEService.readDescriptorForDevice(
      deviceTimeService,
      currentTimeCharacteristic,
      currentTimeCharacteristicTimeTriggerDescriptor
    )
      .then(descriptor => {
        const date = getDateUint8Array(descriptor?.value || '')
        addDataToTimeReads(date)
      })
      .catch(error => {
        console.error(error)
        addDataToTimeReads(`ERROR ${error}`)
      })

  const writeTimeDescriptorForDevice = () => {
    addDataToTimeReads('new date written')
    BLEService.writeDescriptorForDevice(
      deviceTimeService,
      currentTimeCharacteristic,
      currentTimeCharacteristicTimeTriggerDescriptor,
      getDateAsBase64(new Date())
    )
  }

  // eslint-disable-next-line react/no-array-index-key
  const timeEntriesToRender = dataReads.map((entry, index) => <AppText key={index}>{entry}</AppText>)

  return (
    <ScreenDefaultContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <AppTextInput
          placeholder="Device name to connect"
          value={expectedDeviceName}
          onChangeText={setExpectedDeviceName}
        />
        <TestStateDisplay label="Looking for device" state={testScanDevicesState} />
        <AppButton label="Find and connect legacy" onPress={() => connectDevice(false)} />
        <AppButton label="Find and connect advertising extension" onPress={() => connectDevice(true)} />
        <AppButton label="Discover characteristics" onPress={discoverCharacteristics} />
        <AppButton label="Setup on device disconnected" onPress={() => setupOnDeviceDisconnected()} />
        <AppButton label="Clear responses" onPress={() => setDataReads([])} />
        <AppButton label="Write time" onPress={writeTimeDescriptorForDevice} />
        <AppButton label="Read time" onPress={readTimeDescriptorForDevice} />
        {timeEntriesToRender}
      </ScrollView>
    </ScreenDefaultContainer>
  )
}
