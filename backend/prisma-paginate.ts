/** Pagination util for prisma orm */

import { BadRequestException } from '@nestjs/common'
import { Prisma } from '@prisma/client';
import { DefaultArgs } from '@prisma/client/runtime/library';

export function handlePaginationQuery(query: any) {


  let { page, limit, search = '', startDate, endDate, ...others } = query;

  page = Math.abs(parseInt(page) || 1) - 1;
  limit = Math.abs(parseInt(limit) || 10);

  const filter = {};
  const sort = {} as { [key: string]: string }

  Object.entries(others).forEach(([key, value]) => {

    // if filed start with Sort_ then add to sort list 
    if (key.startsWith('Sort_')) {
      sort[key.slice(5)] = value as string
      return
    }

    if (typeof value !== 'object') {
      filter[key] = value;
    }
    if (Array.isArray(value)) {
      filter[key] = {
        in: value,
      };
    }
  });

  return {
    sort,
    take: limit,
    skip: page * limit,
    search,
    filter,
    startDate,
    endDate
  };
}

type paginateArgs<ModelType, ModelArgType> = {
  model: any;
  args?: ModelArgType;
  searchFields?: Array<keyof ModelType>;
  query?: any;
  skipDateSort?: boolean
};
export async function prismaPaginate<PrismaModelType, PrismaModelArgType>({
  model,
  args,
  query,
  searchFields,
  skipDateSort
}: paginateArgs<PrismaModelType, PrismaModelArgType>) {


  let { filter, search, sort, startDate, endDate, ...rest } = handlePaginationQuery(query);

  // @ts-ignore
  let { where, orderBy, ...restOfArgs } = args || {}

  if (!where) where = {}

  /**---------------- SORT Logic ----------------- */

  // setting orderBy to an array 
  if (typeof orderBy == 'object' && !Array.isArray(orderBy)) {
    orderBy = [orderBy]
  }

  if (!orderBy) orderBy = []

  Object.entries(sort).forEach(([key, value]) => {
    orderBy.push(
      { [key]: value }
    )
  })

  // default sort order 
  if (!orderBy.length && !skipDateSort) {
    orderBy.push({ createdAt: 'desc', })
  }

  /**---------------- END ----------------- */

  // removing extra space
  if (search) {
    search = (search as string)
      .trim()
      .split(' ')
      .filter((t) => t != '')
      .join(' | ');
  }

  // if search and searchFields exist modify the where object
  if (search && searchFields?.length) {
    const searchQuery = {
      OR: searchFields.map((field) => ({
        [field]: {
          contains: search,
          mode: 'insensitive'
        },
      })),
    };

    if (where.OR) {

      where.OR = (where.OR as Array<any>).map(or => ({
        ...or,
        OR: searchQuery.OR
      }))

    } else {

      where.OR = searchQuery.OR;

    }
  }

  // appending filter into where
  where = {
    ...where,
    ...filter,
    ...((startDate || endDate) && {
      createdAt: {
        gte: startDate || new Date('01-01-2023'),
        lte: endDate || new Date()
      }
    })
  };

  const count = await model.count({ where });
  const docs = await model.findMany({
    ...rest,
    ...restOfArgs,
    orderBy,
    where,
  });

  return {
    page: +query.page || 1,
    limit: rest.take,
    last_page: Math.ceil(count / rest.take),
    totalDocs: count,
    offset: rest.skip,
    docs,
  };
}
