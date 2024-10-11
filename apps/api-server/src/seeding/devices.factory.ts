import { setSeederFactory } from 'typeorm-extension';
import { Device } from '../modules/device/entities/device.entity';
import { OperatingSystem } from '../modules/device/domain/operating-system.enum';

export const DeviceFactory = setSeederFactory(Device, () => {
  const operatingSystems = Object.values(OperatingSystem);
  const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % operatingSystems.length;
  const randomOS = operatingSystems[randomIndex];

  const device = new Device({
    operating_system: randomOS,
  });

  return device;
});
