
export interface IGeneralConfig {
  // TODO iso: figure out more general type here
  [key : string] : any;
  env : string;
  postDeploy : {
    tenderlyProjectSlug : string;
    monitorContracts : boolean;
    verifyContracts : boolean;
  };
}
