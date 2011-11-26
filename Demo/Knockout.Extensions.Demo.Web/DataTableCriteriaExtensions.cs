using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using Knockout.Extensions.Demo.Web.Models;

namespace Knockout.Extensions.Demo.Web
{
    public static class DataTableCriteriaExtensions
    {
        public static IEnumerable<TEntity> ApplyCriteria<TEntity>(this IEnumerable<TEntity> query, DataTableCriteria criteria)
        {
            if (criteria == null)
                return query;

            // Apply ordering to query.
            IList<DataTableColumnCriteria> columnCriteria = criteria.Columns
                .Where(e => e.IsSorted)
                .OrderBy(e => e.SortOrder)
                .ToList();

            int k = 0;

            foreach (var c in columnCriteria)
            {
                if (c.SortDirection == SortDirection.Ascending)
                {
                    if (k == 0)
                        query = query.AsQueryable().ApplyOrder(c.ColumnName, QuerySortOrder.OrderBy);
                    else
                        query = query.AsQueryable().ApplyOrder(c.ColumnName, QuerySortOrder.ThenBy);
                }
                else
                {
                    if (k == 0)
                        query = query.AsQueryable().ApplyOrder(c.ColumnName, QuerySortOrder.OrderByDescending);
                    else
                        query = query.AsQueryable().ApplyOrder(c.ColumnName, QuerySortOrder.ThenByDescending);
                }

                k++;
            }

            // Apply paging to query..
            query = query
                .Skip(criteria.RecordsToSkip)
                .Take(criteria.RecordsToTake);

            return query;
        }
    }
}