import BaseRepository from './BaseRepository.js';
import DDSCollection from '../models/DDSCollection.js';

export class DDSCollectionRepository extends BaseRepository {
  constructor() {
    super(DDSCollection);
  }
}

const ddsCollectionRepositoryInstance = new DDSCollectionRepository();
export default ddsCollectionRepositoryInstance;
export { ddsCollectionRepositoryInstance as DDSCollectionRepositoryInstance };
