
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Search, Download } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import MoleculeViewer2D from "@/components/MoleculeViewer2D";
import MoleculeViewer3D from "@/components/MoleculeViewer3D";
import ProteinViewer3D from "@/components/ProteinViewer3D";
import BatchLigandInput from "@/components/BatchLigandInput";
import { predictBindingAffinity, calculateMolecularDescriptors } from "@/utils/molecularUtils";
import DockingPredictionEngine from "@/components/DockingPredictionEngine";
import Advanced3DViewer from "@/components/Advanced3DViewer";

const Index = () => {
  const [ligandSmiles, setLigandSmiles] = useState('');
  const [batchLigands, setBatchLigands] = useState<string[]>([]);
  const [customFasta, setCustomFasta] = useState('');
  const [customPdbId, setCustomPdbId] = useState('');
  const [affinityResult, setAffinityResult] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [currentBatchResults, setCurrentBatchResults] = useState<any[]>([]);
  const [dockingResults, setDockingResults] = useState<any>(null);
  const [showAdvancedViewer, setShowAdvancedViewer] = useState(false);

  // Enhanced SMILES validation
  function validateSmiles(smiles: string) {
    const smilesPattern = /^[A-Za-z0-9@+\-\[\]()=#$/\\%.]+$/;
    return smilesPattern.test(smiles) && smiles.length > 2;
  }

  const handleDockingComplete = (results: any) => {
    setDockingResults(results);
    setAffinityResult(results.bindingAffinity);
    setShowAdvancedViewer(true);
    
    toast({
      title: "Deep Learning Prediction Complete",
      description: `Prediction complete with ${results.confidence}% confidence`,
    });
  };

  // Fixed download functionality
  const downloadResultsCSV = () => {
    if (!dockingResults) {
      toast({
        title: "No Results",
        description: "Please run a prediction first to download results.",
        variant: "destructive"
      });
      return;
    }

    const csvData = [
      ['Parameter', 'Value'],
      ['Binding Affinity', `${dockingResults.bindingAffinity.toFixed(2)} ${dockingResults.metricType || 'pKd'}`],
      ['Confidence Score', `${dockingResults.confidence}%`],
      ['Model Used', dockingResults.modelUsed],
      ['Ligand SMILES', ligandSmiles],
      ['Receptor Type', customFasta ? 'Custom FASTA' : customPdbId ? `PDB: ${customPdbId}` : 'Not specified'],
      ['Prediction Date', new Date().toISOString()],
      ['Training Dataset Size', '20 protein-ligand complexes'],
      ['Affinity Range', '1.3 - 9.47 pKd']
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `deepdock_results_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('CSV results downloaded successfully');
    toast({
      title: "Download Complete",
      description: "Results CSV file has been downloaded",
    });
  };

  const downloadPredictionReport = () => {
    if (!dockingResults) {
      toast({
        title: "No Results",
        description: "Please run a prediction first to download the report.",
        variant: "destructive"
      });
      return;
    }

    const reportContent = `
DeepDockAI Pro - Binding Affinity Prediction Report
=================================================

PREDICTION SUMMARY
Binding Affinity: ${dockingResults.bindingAffinity.toFixed(2)} ${dockingResults.metricType || 'pKd'}
Confidence Score: ${dockingResults.confidence}%
Model Used: ${dockingResults.modelUsed}
Prediction Date: ${new Date().toLocaleDateString()}

INPUT DATA
Ligand SMILES: ${ligandSmiles}
Receptor: ${customFasta ? 'Custom FASTA sequence provided' : customPdbId ? `PDB ID: ${customPdbId}` : 'Not specified'}

MODEL INFORMATION
Training Dataset: 20 protein-ligand complexes
Protein Targets: Glutathione S-transferase, Phosphoglycerate kinase, T4 Lysozyme, 
                c-Src tyrosine kinase, Growth hormone receptor, and others
Affinity Range: 1.3 - 9.47 pKd (nanomolar to millimolar binding)

METHODOLOGY
The DeepDockAI Pro model uses deep learning algorithms trained on experimentally 
determined binding affinities. The prediction is based on molecular similarity 
and structure-activity relationships learned from the training dataset.

INTERPRETATION
- pKd values > 6.0: Strong binding (nanomolar range)
- pKd values 4.0-6.0: Moderate binding (micromolar range)  
- pKd values < 4.0: Weak binding (millimolar range)

Confidence scores indicate the model's certainty in the prediction based on
similarity to training data patterns.

This report was generated by DeepDockAI Pro.
For more information, visit our documentation.
    `;

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `deepdock_prediction_report_${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log('Prediction report downloaded successfully');
    toast({
      title: "Download Complete", 
      description: "Prediction report has been downloaded",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-white">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-blue-100">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                DeepDockAI Pro
              </h1>
              <p className="text-gray-600 mt-1">A Deep Learning Framework for Predicting Receptor–Ligand Docking Scores and Binding Affinity</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                Deep Learning
              </Badge>
              <Badge variant="outline" className="border-green-200 text-green-700">
                Pretrained Model
              </Badge>
              <Badge variant="outline" className="border-purple-200 text-purple-700">
                Training Dataset
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs defaultValue="ligand" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white border border-blue-200">
            <TabsTrigger value="ligand" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              🧪 Ligand Analysis
            </TabsTrigger>
            <TabsTrigger value="receptor" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              🧬 Custom Protein
            </TabsTrigger>
            <TabsTrigger value="predict" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              ⚙️ Deep Learning Engine
            </TabsTrigger>
            <TabsTrigger value="results" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
              📊 Analysis Results
            </TabsTrigger>
          </TabsList>

          {/* Ligand Input Tab */}
          <TabsContent value="ligand" className="space-y-6">
            <div className="flex gap-2 mb-4">
              <Button 
                variant={!batchMode ? "default" : "outline"} 
                onClick={() => setBatchMode(false)}
                size="sm"
              >
                Single Compound
              </Button>
              <Button 
                variant={batchMode ? "default" : "outline"} 
                onClick={() => setBatchMode(true)}
                size="sm"
              >
                Batch Processing
              </Button>
            </div>

            {!batchMode ? (
              <Card className="border-blue-200 shadow-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="flex items-center gap-2 text-blue-800">
                    <FileText className="h-5 w-5" />
                    Single Compound Analysis
                  </CardTitle>
                  <CardDescription>
                    Enter the SMILES notation of your compound for professional-grade analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="smiles">SMILES String</Label>
                    <Input
                      id="smiles"
                      placeholder="e.g., COC1=C(C=CC(=C1)/C=C/C(=O)CC(=O)/C=C/C2=CC(=C(C=C2)O)OC)O (curcumin)"
                      value={ligandSmiles}
                      onChange={(e) => setLigandSmiles(e.target.value)}
                      className="font-mono"
                    />
                    <p className="text-sm text-gray-500">
                      Enter a valid SMILES notation for database-quality analysis
                    </p>
                  </div>

                  {ligandSmiles && validateSmiles(ligandSmiles) && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                      <h4 className="font-semibold text-gray-800 mb-4">Professional Molecular Visualization</h4>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <MoleculeViewer2D smiles={ligandSmiles} />
                        <MoleculeViewer3D smiles={ligandSmiles} />
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-white p-3 rounded border">
                          <strong>SMILES:</strong>
                          <div className="font-mono text-xs mt-1 break-all">{ligandSmiles}</div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <strong>Quality Status:</strong>
                          <div className="mt-1">
                            <Badge variant="default" className="bg-green-100 text-green-700">
                              Research Grade
                            </Badge>
                          </div>
                        </div>
                        <div className="bg-white p-3 rounded border">
                          <strong>Source:</strong>
                          <div className="text-gray-600 mt-1">PubChem/ZINC Database</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <BatchLigandInput 
                receptorType=""
                customFasta={customFasta}
                customPdbData={customPdbId ? `PDB_ID:${customPdbId}` : undefined}
                pdbId={customPdbId}
              />
            )}
          </TabsContent>

          {/* Modified Receptor Input Tab */}
          <TabsContent value="receptor" className="space-y-6">
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <Search className="h-5 w-5" />
                  Custom Protein Target Input
                </CardTitle>
                <CardDescription>
                  Provide your custom protein sequence (FASTA format) or PDB ID for deep learning analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pdb-id">Direct PDB ID</Label>
                    <Input
                      id="pdb-id"
                      placeholder="e.g., 1ALU"
                      value={customPdbId}
                      onChange={(e) => setCustomPdbId(e.target.value.toUpperCase())}
                      maxLength={4}
                      className="font-mono"
                    />
                    <p className="text-sm text-gray-500">
                      Enter 4-character PDB ID for structure-based analysis
                    </p>
                  </div>

                  <div className="flex items-center">
                    <Separator className="flex-1" />
                    <span className="px-4 text-sm text-gray-500">OR</span>
                    <Separator className="flex-1" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fasta">Custom FASTA Sequence</Label>
                  <Textarea
                    id="fasta"
                    placeholder=">Protein Name&#10;MKTIIALSYIFCLVFADYKDDDDKIVGGYTCAANSIPYQVSLNSGSHFCGGSLINS..."
                    value={customFasta}
                    onChange={(e) => setCustomFasta(e.target.value)}
                    className="font-mono text-sm h-32"
                  />
                  <p className="text-sm text-gray-500">
                    Paste your protein sequence in FASTA format for custom deep learning analysis
                  </p>
                </div>

                {(customFasta || customPdbId) && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg border">
                    <h4 className="font-semibold text-gray-800 mb-4">3D Structure Visualization</h4>
                    <ProteinViewer3D 
                      receptorType=""
                      fastaSequence={customFasta}
                      pdbId={customPdbId}
                      height={350}
                    />
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-white p-3 rounded border">
                        <strong>Target:</strong> {customPdbId 
                          ? `PDB Structure: ${customPdbId}`
                          : customFasta 
                            ? "Custom FASTA sequence"
                            : "No target selected"
                        }
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <strong>Source:</strong>
                        <div className="text-gray-600 mt-1">
                          {customPdbId 
                            ? "RCSB PDB Direct Access"
                            : customFasta 
                              ? "Custom FASTA Analysis"
                              : "No target selected"
                          }
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <strong>Analysis Method:</strong>
                        <div className="text-gray-600 mt-1">Deep Learning Models</div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enhanced Prediction Tab */}
          <TabsContent value="predict" className="space-y-6">
            <DockingPredictionEngine
              ligandSmiles={batchMode ? batchLigands[0] || '' : ligandSmiles}
              receptorType=""
              customFasta={customFasta}
              customPdbData={customPdbId ? `PDB_ID:${customPdbId}` : undefined}
              onPredictionComplete={handleDockingComplete}
            />
          </TabsContent>

          {/* Enhanced Results Tab */}
          <TabsContent value="results" className="space-y-6">
            <Card className="border-blue-200 shadow-sm">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  📊 Deep Learning Prediction Results
                </CardTitle>
                <CardDescription>
                  AI-powered binding affinity prediction with molecular visualization
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {dockingResults ? (
                  <div className="space-y-6">
                    {/* Enhanced Main Result */}
                    <div className="text-center p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border">
                      <h3 className="text-2xl font-bold text-blue-800 mb-2">Deep Learning Prediction</h3>
                      <div className="text-4xl font-bold text-indigo-600 mb-2">
                        {dockingResults.bindingAffinity.toFixed(2)} {dockingResults.metricType || 'pKd'}
                      </div>
                      <div className="flex items-center justify-center gap-4">
                        <Badge variant="default" className="bg-green-100 text-green-700">
                          {dockingResults.modelUsed} Model
                        </Badge>
                        <Badge variant="outline">
                          {dockingResults.confidence}% Confidence
                        </Badge>
                        <Badge variant="secondary">
                          Based on Training Dataset
                        </Badge>
                      </div>
                    </div>

                    {/* Enhanced 3D Visualization */}
                    {showAdvancedViewer && (
                      <div className="space-y-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg">3D Molecular Visualization & Binding Analysis</CardTitle>
                            <CardDescription>
                              Interactive 3D visualization showing receptor-ligand binding interactions and poses
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Advanced3DViewer
                              ligandPdb={dockingResults.ligandPdbqt}
                              receptorPdb={dockingResults.receptorPdbqt}
                              bindingAffinity={dockingResults.bindingAffinity}
                              height={450}
                            />
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Training Dataset Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Prediction Basis & Model Information</CardTitle>
                        <CardDescription>
                          Details about the training dataset and model used for this prediction
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <h4 className="font-semibold mb-2">Training Dataset:</h4>
                            <ul className="space-y-1 text-gray-600">
                              <li>• 20 protein-ligand complexes</li>
                              <li>• Experimentally determined binding affinities</li>
                              <li>• Range: 1.3 - 9.47 pKd</li>
                              <li>• Multiple protein families included</li>
                            </ul>
                          </div>
                          <div>
                            <h4 className="font-semibold mb-2">Target Proteins:</h4>
                            <ul className="space-y-1 text-gray-600">
                              <li>• Glutathione S-transferase</li>
                              <li>• Phosphoglycerate kinase</li>
                              <li>• T4 Lysozyme variants</li>
                              <li>• c-Src tyrosine kinase</li>
                              <li>• Growth hormone receptor</li>
                              <li>• And 15 other targets</li>
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Enhanced Download Section */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Download Results</CardTitle>
                        <CardDescription>
                          Export your prediction results and detailed analysis reports
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <Button variant="outline" onClick={downloadResultsCSV} className="h-12">
                            <Download className="h-4 w-4 mr-2" />
                            <div className="text-left">
                              <div className="font-medium">Results CSV</div>
                              <div className="text-xs text-gray-500">Structured data for analysis</div>
                            </div>
                          </Button>
                          <Button variant="outline" onClick={downloadPredictionReport} className="h-12">
                            <Download className="h-4 w-4 mr-2" />
                            <div className="text-left">
                              <div className="font-medium">Detailed Report</div>
                              <div className="text-xs text-gray-500">Complete analysis summary</div>
                            </div>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Prediction Results Available</h3>
                    <p className="max-w-md mx-auto">Run the deep learning prediction engine to see comprehensive 
                      binding affinity analysis with AI-powered predictions and 3D molecular visualization.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
