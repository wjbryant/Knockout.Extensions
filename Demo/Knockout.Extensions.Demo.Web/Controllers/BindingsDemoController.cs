using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Knockout.Extensions.Demo.Web.Models;

namespace Knockout.Extensions.Demo.Web.Controllers
{
    public class BindingsDemoController : Controller
    {
        public BindingsDemoController()
        {
            _data = CreateData();
        }

        private readonly ICollection<Record> _data;

        public virtual ActionResult Index()
        {
            return View();
        }

        public virtual ActionResult GetData(DataTableCriteria criteria)
        {
            var result = new DataGridResult<Record>();

            var data = _data.ApplyCriteria(criteria);

            result.Data = data.ToList();
            result.DisplayedRecords = _data.Count();
            result.TotalRecords = _data.Count();

            return Json(result);
        }

        private ICollection<Record> CreateData()
        {
            List<Record> records = new List<Record>();
            int idCount = 0;
            int cellCount = 0;

            for (int i = 0; i < 100; i++)
                records.Add(new Record() { Id = ++idCount, Column1 = "cell " + (++cellCount).ToString(), Column2 = "cell " + (++cellCount).ToString(), Column3 = "cell " + (++cellCount).ToString() });

            return records;
        }

        private class Record
        {
            public int Id { get; set; }
            public string Column1 { get; set; }
            public string Column2 { get; set; }
            public string Column3 { get; set; }
        }

    }
}
