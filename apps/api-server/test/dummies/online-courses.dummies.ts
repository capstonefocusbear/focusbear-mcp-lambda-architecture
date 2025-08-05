import { Lesson } from '../../src/modules/lesson/entities/lesson.entity';
import { adminUserDummy, userDummy } from '.';
import { Course } from '../../src/modules/course/entities/course.entity';
import { CourseEnrolment } from '../../src/modules/course/entities/course-enrolment.entity';
import { LessonCompletion } from '../../src/modules/lesson/entities/lesson-completion.entity';
import { CourseRating } from '../../src/modules/course/entities/course-rating.entity';
import { Platform } from '../../src/shared/domain/platform.enum';

export const DummyCourseOneLessons = [
  new Lesson({
    id: '1084ab80-7394-4b4e-9c0b-cddcb734293a',
    title: 'Fundamental Ideas Around Microservices',
    content:
      'The fundamental of microservice design is using the correct API. This is crucial to maintaining communication between the service and the client calls. Easy transition and execution are important for proper functioning. Another important thing to note while creating an API is the domain of the business.',
    url: 'https://www.youtube.com/watch?v=c9JdXwymqRR',
  }),
  new Lesson({
    id: '4d003283-d039-4fc4-8eb1-1f0bf6c0d06a',
    title: 'A Mini-Microservices App',
    content:
      'It implies that a microservice should be small enough to be developed in approximately one week by a team that can be fed by two pizzas. This originated from Amazon, where Jeff Bezos instituted a rule that team sizes must not be larger than the number of people who can be fed by two pizzas',
    url: 'https://www.youtube.com/watch?v=c9JdXwymqBB',
  }),
  new Lesson({
    id: '0700c94c-7161-40de-aaa5-873c9763c59d',
    title: 'Running Services with Docker',
    content:
      'Docker service create command is used to create instances (called tasks) of that service running in a cluster (called swarm) of computers (called nodes). Those tasks are containers of course, but not standalone containers. In a sense a service acts as a template when instantiating tasks.',
    url: 'https://www.youtube.com/watch?v=c9JdXwymqCC',
  }),
];

const DummyCourseTwoLessons = [
  new Lesson({
    id: '2707e1c5-ff9f-4ab3-a8f6-b5b003ae1e15',
    title: 'WELL-KNOWN FACT ABOUT STARTING A BUSINESS',
    content:
      'Getting the right advice and direction from an expert will help you greatly decrease your learning curve, minimize your period of struggle, and give you the best chance to succeed.',
    url: 'https://www.youtube.com/watch?v=c9JdXwymqDD',
  }),
  new Lesson({
    id: '98c7d6a4-1a37-4690-a61d-b2e7c805bfbb',
    title: 'WHY THIS BUSINESS COURSE IS UNIQUE',
    content:
      'There is a unique story behind this course. I originally created the Problemio business apps which now have over 1,000,000 entrepreneurs who downloaded the apps.',
    url: 'https://www.youtube.com/watch?v=c9JdXwymqEE',
  }),
  new Lesson({
    id: 'd3732d78-198d-4844-a266-6add3e40bc95',
    title: 'WHAT YOU WILL ACCOMPLISH BY THE END OF THE COURSE',
    content:
      'By the end of this course, you will no longer be one of thousands of "wantapreneurs." You will have taken your first positive steps to business success. You will become a strong and independent entrepreneur. You\'ll know exactly where you are going in business and how you are going to get there. You will be able to make correct and confident decisions.  ',
    url: 'https://www.youtube.com/watch?v=c9JdXwymqAA',
  }),
];

const DummyCourseThreeLessons = [
  new Lesson({
    id: 'eb4d5161-c327-4fc4-81e7-2ec6684c8238',
    title: 'Build a business',
    content:
      'A blog can be the center of a low-overhead, location-independent, lucrative business. There has never been a better time to do this—the Internet has made it cheaper and easier than ever before for anyone to start a business.',
    url: 'https://www.youtube.com/watch?v=c9JdXwymqZZ',
  }),
  new Lesson({
    id: 'cc4b3f7c-739e-4d45-8631-d46830f23fd0',
    title: 'Grow an existing business',
    content:
      "Content marketing is one of the best ways to drive your business forward, and a blog is a tried and true format. Many of the world's biggest companies and brands are now using digital content to market their products and services, so you'll be in great company if you do the same.",
    url: 'https://www.youtube.com/watch?v=c9JdXwymqYY',
  }),
  new Lesson({
    id: 'a6f4b05d-9ab9-45b0-a945-1669781a01bf',
    title: 'Showcase your expertise',
    content:
      " If you want to position yourself as a thought leader or expert, blogging is an excellent way to do it. A blog can be a powerful asset if you're trying to build a personal brand, get a job, sell services, or launch a career in public speaking.",
    url: 'https://www.youtube.com/watch?v=c9JdXwymqFF',
  }),
];

export const DummyCourseOne = new Course({
  id: '09518ed1-598d-4f4c-ac67-53074fef8768',
  name: 'Microservices with Node JS and React',
  description:
    'Build, deploy, and scale an E-Commerce app using Microservices built with Node, React, Docker and Kubernetes',
  is_hidden: false,
  deleted: false,
  lessons: DummyCourseOneLessons,
  author_id: userDummy.id,
});

export const DummyCourseTwo = new Course({
  id: '67628028-a998-409a-95b1-e77798423060',
  name: 'Entrepreneurship: How To Start A Business From Business Idea',
  description: 'Business fundamentals: Strategies to turn your startup business idea into a successful business',
  is_hidden: false,
  deleted: false,
  lessons: DummyCourseTwoLessons,
  author_id: adminUserDummy.id,
  platform: Platform.MAC,
});

export const DummyCourseThree = new Course({
  id: '33e2242f-515a-4042-a4c6-878c2283ce42',
  name: 'Blogging Masterclass: How To Build A Successful Blog In 2023',
  description:
    'Build a successful blog using these proven blogging strategies for content, promotion, list building, and monetization',
  is_hidden: false,
  deleted: false,
  author: userDummy,
  lessons: DummyCourseThreeLessons,
  author_id: userDummy.id,
  platform: Platform.MAC,
});

export const DummyCourseEnrolments = [
  new CourseEnrolment({
    id: '1075f953-ec7b-4b54-940a-79cf5d6b79be',
    user_id: userDummy.id,
    course_id: DummyCourseOne.id,
  }),
  new CourseEnrolment({
    id: 'd542fbbd-22fc-43a2-9dff-0134f0571075',
    user_id: userDummy.id,
    course_id: DummyCourseTwo.id,
  }),
  new CourseEnrolment({
    id: '11badbba-5e43-4b6a-b4d1-a2a8d9099eed',
    user_id: '6a531325-b8e4-4acd-aab1-c151c2a38ec4',
    course_id: DummyCourseOne.id,
  }),
  new CourseEnrolment({
    id: 'c7f38366-c6fc-40fb-8a81-a11705bc57b0',
    user_id: adminUserDummy.id,
    course_id: DummyCourseOne.id,
  }),
  new CourseEnrolment({
    id: 'ba03a77c-f48d-49f2-a87b-14f6029192ec',
    user_id: adminUserDummy.id,
    course_id: DummyCourseTwo.id,
  }),
  new CourseEnrolment({
    id: '1113d736-9a8e-435a-a1dd-7297954c3f14',
    user_id: adminUserDummy.id,
    course_id: DummyCourseThree.id,
  }),
];

export const DummyCourseLessonCompletion = [
  new LessonCompletion({
    id: 'a533c821-c15d-401e-b5bb-fd4d4311c547',
    lesson_id: DummyCourseThreeLessons[0].id,
    course_id: DummyCourseThree.id,
    user_id: adminUserDummy.id,
  }),
  new LessonCompletion({
    id: 'b5e0ff30-320d-4c05-a2c0-98be6447a1e3',
    lesson_id: DummyCourseOneLessons[0].id,
    course_id: DummyCourseOne.id,
    user_id: userDummy.id,
  }),
  new LessonCompletion({
    id: '6f75e293-6281-4818-910b-043ad1d86fb6',
    lesson_id: DummyCourseOneLessons[1].id,
    course_id: DummyCourseOne.id,
    user_id: userDummy.id,
  }),
  new LessonCompletion({
    id: '12a6948e-ed9e-4cc1-9b76-eea67a58fcfb',
    lesson_id: DummyCourseThreeLessons[0].id,
    course_id: DummyCourseThree.id,
    user_id: '5d61a599-ead1-40f9-9f92-4fa4c048c8a9',
  }),
];

export const DummyCourseRating = [
  new CourseRating({
    id: '5a22e86e-b836-463b-80ef-d921292f84c4',
    course_id: DummyCourseThree.id,
    user_id: userDummy.id,
  }),
  new CourseRating({
    id: '21508d95-8607-4db6-8bf1-4b8699dead12',
    course_id: DummyCourseOne.id,
    user_id: userDummy.id,
  }),
  new CourseRating({
    id: 'f503485b-125a-4806-9c39-4a880aa90c73',
    course_id: DummyCourseOne.id,
    user_id: adminUserDummy.id,
  }),
  new CourseRating({
    id: 'f52d0bfe-4d1d-47f0-b89f-b520440ef9ec',
    course_id: DummyCourseTwo.id,
    user_id: adminUserDummy.id,
  }),
];

const DummyCreateCourseOneLessonsDto = [
  new Lesson({
    id: '1084ab80-7394-4b4e-9c0b-cddcb734293a',
    title: 'Fundamental Ideas Around Microservices',
    content:
      'The fundamental of microservice design is using the correct API. This is crucial to maintaining communication between the service and the client calls. Easy transition and execution are important for proper functioning. Another important thing to note while creating an API is the domain of the business.',
    url: 'https://www.youtube.com/watch?v=c9JdXwymqRR',
  }),
  new Lesson({
    id: '4d003283-d039-4fc4-8eb1-1f0bf6c0d06a',
    title: 'A Mini-Microservices App',
    content:
      'It implies that a microservice should be small enough to be developed in approximately one week by a team that can be fed by two pizzas. This originated from Amazon, where Jeff Bezos instituted a rule that team sizes must not be larger than the number of people who can be fed by two pizzas',
    url: 'https://www.youtube.com/watch?v=c9JdXwymqBB',
  }),
  new Lesson({
    id: '0700c94c-7161-40de-aaa5-873c9763c59d',
    title: 'Running Services with Docker',
    content:
      'Docker service create command is used to create instances (called tasks) of that service running in a cluster (called swarm) of computers (called nodes). Those tasks are containers of course, but not standalone containers. In a sense a service acts as a template when instantiating tasks.',
    url: 'https://www.youtube.com/watch?v=c9JdXwymqCC',
  }),
];

export const DummyCreateCourseDto = {
  name: DummyCourseOne.name,
  description: DummyCourseOne.description,
  lessons: DummyCourseOne.lessons,
};

export const DummyUpdateCourseDto = {
  name: 'Blogging Masterclass: How To Build A Successful Blog In 2022',
  description: DummyCourseThree.description,
  lessons: DummyCreateCourseOneLessonsDto,
};

export const DummyCreateLessonRatingDto = {
  rating: 3,
  course_id: DummyCourseOne.id,
  lesson_id: DummyCourseOneLessons[0].id,
  review: 'this is dummy review text for dummy lesson one in dummy course one',
};

export const DummyCreateCourseRatingDto = {
  rating: 4,
  course_id: DummyCourseOne.id,
};

export const DummyCreateCourseEnrolmentDto = {
  course_id: DummyCourseOne.id,
  lesson_id: DummyCourseOneLessons[0].id,
};

export const DummyUpdateCourseEnrolmentDto = {
  course_id: DummyCourseTwo.id,
  finished: true,
};

export const DummyCreateCLessonCompletionDto = {
  course_id: DummyCourseOne.id,
  lesson_id: DummyCourseOneLessons[0].id,
};

export const DummyCourseRatings = [
  new CourseRating({
    user_id: userDummy.id,
    course_id: DummyCourseOne.id,
    rating: 4,
    review: '',
  }),
  new CourseRating({
    user_id: userDummy.id,
    course_id: DummyCourseTwo.id,
    rating: 3,
    review: 'this is dummy review text for dummy course one',
  }),
  new CourseRating({
    user_id: adminUserDummy.id,
    course_id: DummyCourseOne.id,
    rating: 4,
    review: '',
  }),
  new CourseRating({
    user_id: '7678080d-463d-4c1a-b8cc-9526edd2f803',
    course_id: DummyCourseTwo.id,
    rating: 3.5,
    review: 'this is dummy review text for dummy lesson one in dummy course one',
  }),
  new CourseRating({
    user_id: userDummy.id,
    course_id: DummyCourseOne.id,
    rating: 4,
    review: '',
  }),
];

export const DummyCreateLessonDto = {
  course_id: DummyCourseOne.id,
  lessons: DummyCourseOne.lessons,
};

export const DummyUpdateLessonDto = {
  lesson_id: DummyCourseOneLessons[0].id,
  course_id: DummyCourseOne.id,
  lessons: DummyCourseTwo.lessons,
};
