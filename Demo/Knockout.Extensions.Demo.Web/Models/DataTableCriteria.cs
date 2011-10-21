using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace Knockout.Extensions.Demo.Web.Models
{
    public class DataTableCriteria
    {
        public int RecordsToTake { get; set; }
        public int RecordsToSkip { get; set; }
        public string GlobalSearchText { get; set; }

        public ICollection<DataTableColumnCriteria> Columns { get; set; }
    }
}