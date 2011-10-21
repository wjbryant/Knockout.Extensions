using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Knockout.Extensions.Demo.Web.Models
{
    public class DataGridResult<TEntity>
    {
        public DataGridResult()
        {
            Data = new HashSet<TEntity>();
        }

        public DataGridResult(ICollection<TEntity> data, int totalRecords, int displayedRecords)
        {
            Data = data;
            TotalRecords = totalRecords;
            DisplayedRecords = displayedRecords;
        }

        public ICollection<TEntity> Data { get; set; }
        public int TotalRecords { get; set; }
        public int DisplayedRecords { get; set; }
    }
}