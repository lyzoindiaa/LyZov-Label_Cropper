import mongoose from 'mongoose';

const gstr3bReturnSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  businessId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: true,
    index: true,
  },
  period: {
    type: String, // MMYYYY e.g. "092026"
    required: true,
    index: true,
  },
  version: {
    type: Number,
    default: 1,
  },
  status: {
    type: String,
    enum: ['DRAFT', 'COMPUTED', 'RECONCILED', 'FILED_ON_PORTAL'],
    default: 'COMPUTED',
  },

  // 3.1 Details of Outward Supplies and inward supplies liable to reverse charge
  table31: {
    // 3.1(a) Outward taxable supplies (other than zero rated, nil rated and exempted)
    outward_taxable: {
      taxableValuePaise: { type: Number, default: 0 },
      igstPaise: { type: Number, default: 0 },
      cgstPaise: { type: Number, default: 0 },
      sgstPaise: { type: Number, default: 0 },
      cessPaise: { type: Number, default: 0 },
    },
    // 3.1(b) Outward taxable supplies (zero rated)
    outward_zero_rated: {
      taxableValuePaise: { type: Number, default: 0 },
      igstPaise: { type: Number, default: 0 },
      cessPaise: { type: Number, default: 0 },
    },
    // 3.1(c) Other outward supplies (Nil rated, exempted)
    outward_nil_exempt: {
      taxableValuePaise: { type: Number, default: 0 },
    },
    // 3.1(d) Inward supplies (liable to reverse charge)
    inward_reverse_charge: {
      taxableValuePaise: { type: Number, default: 0 },
      igstPaise: { type: Number, default: 0 },
      cgstPaise: { type: Number, default: 0 },
      sgstPaise: { type: Number, default: 0 },
      cessPaise: { type: Number, default: 0 },
    },
    // 3.1(e) Non-GST outward supplies
    non_gst_outward: {
      taxableValuePaise: { type: Number, default: 0 },
    },
  },

  // 3.2 Of the supplies shown in 3.1(a), details of inter-State supplies to unregistered persons, composition persons and UIN holders
  table32: {
    supplies_unregistered: [{
      pos: { type: String, required: true }, // 2-digit state code
      posName: { type: String, default: '' },
      taxableValuePaise: { type: Number, default: 0 },
      igstPaise: { type: Number, default: 0 },
    }],
    supplies_composition: [{
      pos: { type: String, required: true },
      posName: { type: String, default: '' },
      taxableValuePaise: { type: Number, default: 0 },
      igstPaise: { type: Number, default: 0 },
    }],
    supplies_uin: [{
      pos: { type: String, required: true },
      posName: { type: String, default: '' },
      taxableValuePaise: { type: Number, default: 0 },
      igstPaise: { type: Number, default: 0 },
    }],
  },

  // 4. Eligible ITC (from GSTR-2B)
  table4: {
    itc_available: {
      import_goods: { igstPaise: { type: Number, default: 0 }, cessPaise: { type: Number, default: 0 } },
      import_services: { igstPaise: { type: Number, default: 0 }, cessPaise: { type: Number, default: 0 } },
      inward_reverse_charge: {
        igstPaise: { type: Number, default: 0 },
        cgstPaise: { type: Number, default: 0 },
        sgstPaise: { type: Number, default: 0 },
        cessPaise: { type: Number, default: 0 },
      },
      inward_isd: {
        igstPaise: { type: Number, default: 0 },
        cgstPaise: { type: Number, default: 0 },
        sgstPaise: { type: Number, default: 0 },
        cessPaise: { type: Number, default: 0 },
      },
      all_other_itc: {
        igstPaise: { type: Number, default: 0 },
        cgstPaise: { type: Number, default: 0 },
        sgstPaise: { type: Number, default: 0 },
        cessPaise: { type: Number, default: 0 },
      },
    },
    itc_reversed: {
      as_per_rules: {
        igstPaise: { type: Number, default: 0 },
        cgstPaise: { type: Number, default: 0 },
        sgstPaise: { type: Number, default: 0 },
        cessPaise: { type: Number, default: 0 },
      },
      others: {
        igstPaise: { type: Number, default: 0 },
        cgstPaise: { type: Number, default: 0 },
        sgstPaise: { type: Number, default: 0 },
        cessPaise: { type: Number, default: 0 },
      },
    },
    net_itc: {
      igstPaise: { type: Number, default: 0 },
      cgstPaise: { type: Number, default: 0 },
      sgstPaise: { type: Number, default: 0 },
      cessPaise: { type: Number, default: 0 },
    },
    ineligible_itc: {
      as_per_section_17_5: {
        igstPaise: { type: Number, default: 0 },
        cgstPaise: { type: Number, default: 0 },
        sgstPaise: { type: Number, default: 0 },
        cessPaise: { type: Number, default: 0 },
      },
      others: {
        igstPaise: { type: Number, default: 0 },
        cgstPaise: { type: Number, default: 0 },
        sgstPaise: { type: Number, default: 0 },
        cessPaise: { type: Number, default: 0 },
      },
    },
  },

  // 5. Values of exempt, nil-rated and non-GST inward supplies
  table5: {
    from_composition_exempt_nil: {
      interStatePaise: { type: Number, default: 0 },
      intraStatePaise: { type: Number, default: 0 },
    },
    non_gst_inward: {
      interStatePaise: { type: Number, default: 0 },
      intraStatePaise: { type: Number, default: 0 },
    },
  },

  // 5.1 Interest & Late fee
  table51: {
    interest: {
      igstPaise: { type: Number, default: 0 },
      cgstPaise: { type: Number, default: 0 },
      sgstPaise: { type: Number, default: 0 },
      cessPaise: { type: Number, default: 0 },
    },
    late_fee: {
      cgstPaise: { type: Number, default: 0 },
      sgstPaise: { type: Number, default: 0 },
    },
  },

  // 6. Payment of Tax & Statutory Set-off
  table6: {
    tax_payable: {
      igstPaise: { type: Number, default: 0 },
      cgstPaise: { type: Number, default: 0 },
      sgstPaise: { type: Number, default: 0 },
      cessPaise: { type: Number, default: 0 },
    },
    paid_through_itc: {
      igst_used_for_igst: { type: Number, default: 0 },
      igst_used_for_cgst: { type: Number, default: 0 },
      igst_used_for_sgst: { type: Number, default: 0 },
      cgst_used_for_cgst: { type: Number, default: 0 },
      cgst_used_for_igst: { type: Number, default: 0 },
      sgst_used_for_sgst: { type: Number, default: 0 },
      sgst_used_for_igst: { type: Number, default: 0 },
      cess_used_for_cess: { type: Number, default: 0 },
    },
    cash_ledger_used: {
      igstPaise: { type: Number, default: 0 },
      cgstPaise: { type: Number, default: 0 },
      sgstPaise: { type: Number, default: 0 },
      cessPaise: { type: Number, default: 0 },
    },
    net_cash_payable: {
      igstPaise: { type: Number, default: 0 },
      cgstPaise: { type: Number, default: 0 },
      sgstPaise: { type: Number, default: 0 },
      cessPaise: { type: Number, default: 0 },
    },
  },

  // Comparison & Reconciliation against Portal auto-drafted 3B
  comparison: {
    portalSource: {
      type: String,
      enum: ['uploaded_json', 'manual_entry', 'none'],
      default: 'none',
    },
    reconciledAt: { type: Date },
    diffs: [{
      table: { type: String, required: true },
      field: { type: String, required: true },
      label: { type: String, default: '' },
      toolValuePaise: { type: Number, default: 0 },
      portalValuePaise: { type: Number, default: 0 },
      diffPaise: { type: Number, default: 0 },
      isMatch: { type: Boolean, default: true },
    }],
    allMatched: { type: Boolean, default: true },
  },

  jsonFilePath: { type: String, default: '' },
  excelFilePath: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

gstr3bReturnSchema.index({ businessId: 1, period: 1 });

export const Gstr3bReturn = mongoose.model('Gstr3bReturn', gstr3bReturnSchema);
