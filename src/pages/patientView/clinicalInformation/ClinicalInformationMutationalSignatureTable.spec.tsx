import * as ClinicalInformationMutationalSignatureTable from './ClinicalInformationMutationalSignatureTable';
import React from 'react';
import { assert } from 'chai';
import { shallow, mount } from 'enzyme';
import sinon from 'sinon';
import {prepareDataForTable} from "./ClinicalInformationMutationalSignatureTable";

const sampleMutationalSignatureData = [
    {sampleId: 'firstSample',
        uniqueSampleKey: 'firstSample',
        patientId: 'firstPatient',
        uniquePatientKey: 'firstPatient',
        studyId: 'firstStudy',
        mutationalSignatureId: 'firstMutationalSignature',
        value: 1,
        confidence: 1},
    {sampleId: 'secondSample',
        uniqueSampleKey: 'secondSample',
        patientId: 'firstPatient',
        uniquePatientKey: 'firstPatient',
        studyId: 'firstStudy',
        mutationalSignatureId: 'firstMutationalSignature',
        value: 2,
        confidence: 2},
    {sampleId: 'firstSample',
        uniqueSampleKey: 'firstSample',
        patientId: 'firstPatient',
        uniquePatientKey: 'firstPatient',
        studyId: 'firstStudy',
        mutationalSignatureId: 'secondMutationalSignature',
        value: 3,
        confidence: 3}
]

describe('ClinicalInformationMutationalSignatureTable', () => {

    before(()=>{

    });
    after(()=>{

    });

    it('takes mutational signature sample data and formats it for mutational signature table to render', ()=>{
        let result = prepareDataForTable(sampleMutationalSignatureData);

        assert.deepEqual(result, [
            {mutationalSignatureId: 'firstMutationalSignature',
             sampleValues:{
                firstSample: "1%",
                secondSample: "2%"
             }
             },
            {mutationalSignatureId: 'secondMutationalSignature',
                sampleValues:{
                    firstSample: "3%"
                }
            }
        ]);
    });
}

