using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Linq.Expressions;
using System.Reflection;

namespace Knockout.Extensions.Demo.Web
{
    public static class IQueryableExtensions
    {
        /// <summary>
        /// Orders the results of an <see cref="IQueryable[]"/> by ascending order.
        /// </summary>
        /// <typeparam name="TSource">The type of the element in the <see cref="IQueryable[]"/>.</typeparam>
        /// <param name="instance">The instance of <see cref="IQueryable[]"/> to be extended.</param>
        /// <param name="property">The name of the property to be the order by key.</param>
        /// <returns>A sorted <see cref="IOrderedQueryable[]"/></returns>
        public static IOrderedQueryable<TSource> OrderBy<TSource>(this IQueryable<TSource> instance, string property)
        {
            return ApplyOrder<TSource>(instance, property, QuerySortOrder.OrderBy);
        }

        /// <summary>
        /// Orders the results of an <see cref="IQueryable[]"/> by descending order.
        /// </summary>
        /// <typeparam name="TSource">The type of the element in the <see cref="IQueryable[]"/>.</typeparam>
        /// <param name="instance">The instance of <see cref="IQueryable[]"/> to be extended.</param>
        /// <param name="property">The name of the property to be the order by key.</param>
        /// <returns>A sorted <see cref="IOrderedQueryable[]"/></returns>
        public static IOrderedQueryable<TSource> OrderByDescending<TSource>(this IQueryable<TSource> instance, string property)
        {
            return ApplyOrder<TSource>(instance, property, QuerySortOrder.OrderByDescending);
        }

        /// <summary>
        /// Applies a specified sort order to an <see cref="IQueryable[]"/>.
        /// </summary>
        /// <typeparam name="TSource">The type of the element in the <see cref="IQueryable[]"/>.</typeparam>
        /// <param name="instance">The instance of <see cref="IQueryable[]"/> to be extended.</param>
        /// <param name="property">The name of the property to be the order by key.</param>
        /// <param name="sortOrder">The type of sort order to apply to the <see cref="IQueryable[]"/></param>
        /// <returns>A sorted <see cref="IOrderedQueryable[]"/></returns>
        public static IOrderedQueryable<TSource> ApplyOrder<TSource>(this IQueryable<TSource> instance, string property, QuerySortOrder sortOrder)
        {
            string[] props = property.Split('.');
            Type type = typeof(TSource);
            ParameterExpression arg = Expression.Parameter(type, "x");
            Expression expr = arg;

            foreach (string prop in props)
            {
                // use reflection (not ComponentModel) to mirror LINQ
                PropertyInfo pi = type.GetProperty(prop);
                expr = Expression.Property(expr, pi);
                type = pi.PropertyType;
            }

            Type delegateType = typeof(Func<,>).MakeGenericType(typeof(TSource), type);
            LambdaExpression lambda = Expression.Lambda(delegateType, expr, arg);

            object result = typeof(Queryable).GetMethods().Single(
                    method => method.Name == sortOrder.ToString()
                            && method.IsGenericMethodDefinition
                            && method.GetGenericArguments().Length == 2
                            && method.GetParameters().Length == 2)
                    .MakeGenericMethod(typeof(TSource), type)
                    .Invoke(null, new object[] { instance, lambda });

            return (IOrderedQueryable<TSource>)result;
        }
    }
}