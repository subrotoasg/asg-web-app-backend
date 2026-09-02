class QueryBuilder {
  queryModel;
  query;

  constructor(queryModel, query) {
    this.queryModel = queryModel;
    this.query = query;
  }

  // Searching
  search(searchableFields) {
    const searchTerm = this?.query?.searchTerm;
    if (searchTerm) {
      this.queryModel = this.queryModel.find({
        $or: searchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: "i" },
        })),
      });
    }
    return this;
  }

  //  Filtering
  filter() {
    const queryObj = { ...this.query }; // Copy query object
    const excludeFields = ["searchTerm", "sort", "page", "limit", "fields"];
    excludeFields.forEach((el) => delete queryObj[el]);

    this.queryModel = this.queryModel.find(queryObj);
    return this;
  }

  // Sorting
  sort() {
    const sortBy = this?.query?.sort?.split(",")?.join(" ") || "-createdAt";
    this.queryModel = this.queryModel.sort(sortBy);
    return this;
  }

  //  Pagination
  paginate() {
    const page = Number(this?.query?.page) || 1;
    const limit = Number(this?.query?.limit) || 10;
    const skip = (page - 1) * limit;

    this.queryModel = this.queryModel.skip(skip).limit(limit);
    return this;
  }

  //  Field Limiting
  fields() {
    const fields = this?.query?.fields?.split(",")?.join(" ") || "-__v";
    this.queryModel = this.queryModel.select(fields);
    return this;
  }

  // Get final query
  exec() {
    return this.queryModel;
  }
}

export default QueryBuilder;
