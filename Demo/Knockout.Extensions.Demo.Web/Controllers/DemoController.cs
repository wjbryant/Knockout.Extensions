using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using Knockout.Extensions.Demo.Web.Models;

namespace Knockout.Extensions.Demo.Web.Controllers
{
    public class DemoController : Controller
    {

        #region Data Tables Demo

        public virtual ActionResult DataTables()
        {
            return View();
        }

        [HttpPost]
        public virtual ActionResult DataTables(DataTableCriteria searchCriteria)
        {
            // Generate Data
            List<DataTableRecord> allRecords = new List<DataTableRecord>();

            int idCount = 0;
            int cellCount = 0;

            for (int i = 0; i < 100; i++)
                allRecords.Add(new DataTableRecord() { Id = ++idCount, Column1 = "cell " + (++cellCount).ToString(), Column2 = "cell " + (++cellCount).ToString(), Column3 = "cell " + (++cellCount).ToString() });

            // Apply search criteria to data
            var filteredRecord = allRecords.ApplyCriteria(searchCriteria);

            // TODO: Apply searching in the ApplyCriteria function eventually...
            if(!string.IsNullOrWhiteSpace(searchCriteria.GlobalSearchText))
                filteredRecord = filteredRecord.Where(e => e.Column1.Contains(searchCriteria.GlobalSearchText) || e.Column2.Contains(searchCriteria.GlobalSearchText) || e.Column3.Contains(searchCriteria.GlobalSearchText)).ToList();


            // Create response
            var result = new DataGridResult<DataTableRecord>();

            result.Data = filteredRecord.ToList();
            result.DisplayedRecords = allRecords.Count();
            result.TotalRecords = allRecords.Count();

            return Json(result);
        }

        #endregion



        public virtual ActionResult CheckRadioList()
        {
            return View();
        }
        

    }
}
