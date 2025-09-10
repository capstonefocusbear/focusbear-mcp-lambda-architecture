import { setSeederFactory } from 'typeorm-extension';
import { Device } from '../modules/device/entities/device.entity';
import { OperatingSystem } from '../shared/domain/operating-system.enum';

export const DeviceFactory = setSeederFactory(Device, () => {
  const { Unknown, ...OS } = OperatingSystem;
  const operatingSystems = Object.values(OS);
  const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % operatingSystems.length;
  const randomOS = operatingSystems[randomIndex];

  const device = new Device({
    operating_system: randomOS,
  });

  return device;
});
