interface IAPIConfig {
  url: string;
  paginationOptions: {
    defaultPageSize: number
  }
}

const APIConfig: IAPIConfig = {
  url: process.env.API_HOST || 'http://localhost:3333',
  paginationOptions: {
    defaultPageSize: 20,
  },
};

export default APIConfig;
