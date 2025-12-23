import {
  object, string,
} from 'zod';

const schema = object({
  email: string().nonempty().max(64),
  password: string().nonempty().max(1024),
});

export default schema;
