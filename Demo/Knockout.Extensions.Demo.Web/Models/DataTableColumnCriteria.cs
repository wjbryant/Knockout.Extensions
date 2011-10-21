using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Knockout.Extensions.Demo.Web.Models
{
    public class DataTableColumnCriteria
    {
        public string ColumnName { get; set; }
        public bool IsSorted { get; set; }
        public int SortOrder { get; set; }
        public string SearchText { get; set; }
        public bool IsSearchable { get; set; }
        public SortDirection SortDirection { get; set; }
    }
}