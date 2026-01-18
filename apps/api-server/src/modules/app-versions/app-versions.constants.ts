import { OperatingSystem } from '../../shared/domain/operating-system.enum';

export const APP_VERSIONS_SUPPORTED_OPERATING_SYSTEMS: readonly OperatingSystem[] = [
  OperatingSystem.iOS,
  OperatingSystem.Android,
  OperatingSystem.MacOS,
  OperatingSystem.Windows,
  OperatingSystem.Web,
];

export const APP_VERSIONS_OS_QUERY_VALUES = ['ios', 'android', 'mac', 'macos', 'windows', 'web'] as const;
export type AppVersionsOsQueryValue = (typeof APP_VERSIONS_OS_QUERY_VALUES)[number];

export const APP_VERSIONS_OS_DISPLAY_VALUES = ['iOS', 'Android', 'MacOS', 'Windows', 'Web'] as const;

export const APP_VERSIONS_OS_MAP: Record<AppVersionsOsQueryValue, OperatingSystem> = {
  ios: OperatingSystem.iOS,
  android: OperatingSystem.Android,
  mac: OperatingSystem.MacOS,
  macos: OperatingSystem.MacOS,
  windows: OperatingSystem.Windows,
  web: OperatingSystem.Web,
};
