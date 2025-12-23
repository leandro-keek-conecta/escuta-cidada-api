  interface IStorageConfig {
  local: {
    tempFolder: string,
    uploadFolder: string,
  },
}

const storageConfig: IStorageConfig = {
  local: {
    tempFolder: process.env.STORAGE_LOCAL_TEMP_FOLDER || 'temp',
    uploadFolder: process.env.STORAGE_LOCAL_UPLOAD_FOLDER || 'data',
  },
};

export default storageConfig;
