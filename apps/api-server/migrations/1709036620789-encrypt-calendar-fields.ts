import { MigrationInterface, QueryRunner } from 'typeorm';
import { JSONEncryptionTransformer } from 'typeorm-encrypted';
import { FieldTransformer } from '../src/shared/utils/helpers';
import { Calendar } from '../src/modules/calendar/entities/calendar.entity';
import { Notification } from '../src/modules/notification/entities/notification.entity';
import { typeormEncryptionConfig } from '../src/config/typeorm-encryption.config';

export class EncryptCalendarFields1709036620789 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const encryptCalendarFields = (calendar: Calendar) => {
      const calendarCopy = { ...calendar };
      calendarCopy.calendar_id = FieldTransformer.to(calendar.calendar_id);
      calendarCopy.summary = FieldTransformer.to(calendar.summary);
      return calendarCopy;
    };
    const encryptNotificationFields = (notification: Notification) => {
      const notificationCopy = { ...notification };
      notificationCopy.calendar_id = FieldTransformer.to(notification.calendar_id);
      const config = typeormEncryptionConfig('external_metadata');
      notificationCopy.external_metadata = new JSONEncryptionTransformer(config).to(notification.external_metadata);
      return notificationCopy;
    };

    const calendars = await queryRunner.manager.find(Calendar);
    const encryptedCalendarRecords = calendars.map(encryptCalendarFields);
    await queryRunner.manager.save(Calendar, encryptedCalendarRecords);

    const notifications = await queryRunner.manager.find(Notification, {
      select: ['id', 'calendar_id', 'external_metadata'],
    });
    const encryptedNotificationRecords = notifications.map(encryptNotificationFields);
    await queryRunner.manager.save(Notification, encryptedNotificationRecords);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const decryptCalendarFields = (calendar: Calendar) => {
      const calendarCopy = { ...calendar };
      calendarCopy.calendar_id = FieldTransformer.from(calendar.calendar_id);
      calendarCopy.summary = FieldTransformer.from(calendar.summary);
      return calendarCopy;
    };
    const decryptNotificationFields = (notification: Notification) => {
      const notificationCopy = { ...notification };
      notificationCopy.calendar_id = FieldTransformer.from(notification.calendar_id);
      const config = typeormEncryptionConfig('external_metadata');
      notificationCopy.external_metadata = new JSONEncryptionTransformer(config).from(notification.external_metadata);
      return notificationCopy;
    };

    const calendars = await queryRunner.manager.find(Calendar);
    const decryptedCalendarRecords = calendars.map(decryptCalendarFields);
    await queryRunner.manager.save(Calendar, decryptedCalendarRecords);

    const notifications = await queryRunner.manager.find(Notification, {
      select: ['id', 'calendar_id', 'external_metadata'],
    });
    const decryptedNotificationRecords = notifications.map(decryptNotificationFields);
    await queryRunner.manager.save(Notification, decryptedNotificationRecords);
  }
}
